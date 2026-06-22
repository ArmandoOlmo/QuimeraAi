import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";
import {
  sendPaidOrderTransactionalEmails,
  sendPaymentFailedTransactionalEmail,
  sendRefundTransactionalEmail,
} from "../_shared/ecommerce-transactional-emails.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM_EMAIL = Deno.env.get("EMAIL_FROM") || "Quimera Ai <no-reply@quimera.ai>";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const FALLBACK_PLAN_CREDIT_LIMITS: Record<string, number> = {
  free: 60,
  hobby: 500,
  starter: 500,
  pro: 500,
  individual: 500,
  agency: 2000,
  agency_plus: 5000,
  agency_starter: 2000,
  agency_pro: 5000,
  agency_scale: 15000,
  enterprise: 25000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature || !endpointSecret) {
    return new Response("Missing signature or endpoint secret", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  let paymentEvent: any = null;

  try {
    const registration = await registerPaymentEvent(event);
    if (registration.duplicate) {
      return json({ received: true, duplicate: true });
    }

    paymentEvent = registration.row;
    await updatePaymentEventStatus(paymentEvent.id, "processing");

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        console.log(`[stripe-webhook] unhandled event type ${event.type}`);
    }

    if (paymentEvent?.id) await updatePaymentEventStatus(paymentEvent.id, "processed", { processedAt: true });
    return json({ received: true });
  } catch (error: any) {
    if (paymentEvent?.id) {
      await updatePaymentEventStatus(paymentEvent.id, "failed", {
        processingError: error.message || "Webhook processing error",
      }).catch((eventError) => {
        console.error("[stripe-webhook] could not mark event failed:", eventError.message);
      });
    }
    console.error("[stripe-webhook] processing error:", error);
    return new Response(`Webhook Error: ${error.message}`, { status: 500 });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function iso(timestamp?: number | null): string | null {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function isUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function extractPaymentEventRefs(event: Stripe.Event) {
  const object = event.data.object as any;
  const metadata = object?.metadata || {};
  const paymentIntent = object?.object === "payment_intent"
    ? object.id
    : typeof object?.payment_intent === "string"
      ? object.payment_intent
      : object?.payment_intent?.id || metadata.paymentIntentId || metadata.payment_intent_id || null;
  const checkoutSession = object?.object === "checkout.session"
    ? object.id
    : typeof object?.checkout_session === "string"
      ? object.checkout_session
      : object?.checkout_session?.id || metadata.checkoutSessionId || metadata.checkout_session_id || null;

  return {
    paymentIntentId: paymentIntent,
    checkoutSessionId: checkoutSession,
    orderId: metadata.orderId || metadata.order_id || null,
    storeId: metadata.storeId || metadata.store_id || null,
    projectId: isUuid(metadata.projectId || metadata.project_id) ? metadata.projectId || metadata.project_id : null,
  };
}

async function registerPaymentEvent(event: Stripe.Event) {
  const refs = extractPaymentEventRefs(event);
  const { data: existing, error: existingError } = await supabase
    .from("store_payment_events")
    .select("*")
    .eq("provider", "stripe")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const status = String(existing.status || "");
    return { duplicate: status === "processing" || status === "processed", row: existing };
  }

  const { data, error } = await supabase
    .from("store_payment_events")
    .insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      payment_intent_id: refs.paymentIntentId,
      checkout_session_id: refs.checkoutSessionId,
      order_id: refs.orderId,
      store_id: refs.storeId,
      project_id: refs.projectId,
      status: "received",
      payload: event as any,
    })
    .select("*")
    .single();

  if (error) {
    const duplicate = error.code === "23505" || /duplicate|unique/i.test(error.message || "");
    if (duplicate) {
      const { data: raced, error: racedError } = await supabase
        .from("store_payment_events")
        .select("*")
        .eq("provider", "stripe")
        .eq("event_id", event.id)
        .maybeSingle();
      if (racedError) throw racedError;
      if (!raced) throw error;
      const status = String(raced?.status || "");
      return { duplicate: status === "processing" || status === "processed", row: raced };
    }
    throw error;
  }

  return { duplicate: false, row: data };
}

async function updatePaymentEventStatus(
  id: string,
  status: "processing" | "processed" | "failed",
  options: { processingError?: string; processedAt?: boolean } = {},
) {
  const update: Record<string, unknown> = {
    status,
    processing_error: options.processingError || null,
  };
  if (options.processedAt || status === "failed") {
    update.processed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("store_payment_events")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
    await syncSubscription(subscription, {
      tenantId: session.metadata?.tenantId,
      planId: session.metadata?.planId,
      userId: session.metadata?.userId,
    });
    return;
  }

  if (session.metadata?.type === "credit_package" || session.metadata?.type === "ai_credits") {
    await addPurchasedCredits(session);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = await resolveTenantId(subscription);
  if (!tenantId) {
    console.warn("[stripe-webhook] subscription deleted without resolvable tenant:", subscription.id);
    return;
  }

  await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancel_at_period_end: false,
      cancelled_at: iso(subscription.canceled_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  await supabase
    .from("tenants")
    .update({
      subscription_plan: "free",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);
}

async function syncSubscription(subscription: Stripe.Subscription, fallback?: { tenantId?: string; planId?: string; userId?: string }) {
  const tenantId = await resolveTenantId(subscription, fallback?.tenantId, fallback?.userId);
  if (!tenantId) {
    console.warn("[stripe-webhook] subscription without resolvable tenant:", subscription.id, subscription.metadata);
    return;
  }

  const inferredPlanId = await inferPlanId(subscription);
  const planId = fallback?.planId || inferredPlanId || subscription.metadata?.planId || "free";
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === "year" ? "annually" : "monthly";
  const existing = await getLocalSubscription(tenantId);
  const usage = await normalizedCreditsUsage(tenantId, planId, existing?.ai_credits_usage, {
    previousPlanId: existing?.plan_id,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    resetPeriod: shouldResetCreditsForPeriod(existing, subscription),
  });
  const status = subscription.status === "trialing" ? "trial" : subscription.status;

  await supabase
    .from("subscriptions")
    .upsert({
      tenant_id: tenantId,
      plan_id: planId,
      billing_cycle: billingCycle,
      status,
      start_date: iso(subscription.start_date),
      current_period_start: iso(subscription.current_period_start),
      current_period_end: iso(subscription.current_period_end) || new Date().toISOString(),
      trial_end_date: iso(subscription.trial_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: iso(subscription.canceled_at),
      stripe_customer_id: String(subscription.customer),
      stripe_subscription_id: subscription.id,
      ai_credits_usage: usage,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

  await supabase
    .from("tenants")
    .update({
      subscription_plan: planId,
      status: ["active", "trial", "past_due", "incomplete"].includes(status) ? "active" : "expired",
      billing: {
        stripeCustomerId: String(subscription.customer),
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: iso(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        subscriptionStatus: status,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (subscription.metadata?.tenantId !== tenantId || subscription.metadata?.planId !== planId) {
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        ...subscription.metadata,
        tenantId,
        planId,
      },
    });
  }
}

async function resolveTenantId(subscription: Stripe.Subscription, fallbackTenantId?: string, fallbackUserId?: string): Promise<string | null> {
  const candidates = [fallbackTenantId, subscription.metadata?.tenantId].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (await tenantExists(candidate)) return candidate;
  }

  const { data: bySub } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (bySub?.tenant_id) return bySub.tenant_id;

  const customerId = String(subscription.customer);
  const { data: byCustomer } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (byCustomer?.tenant_id) return byCustomer.tenant_id;

  if (fallbackUserId) {
    const { data: member } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", fallbackUserId)
      .limit(1)
      .maybeSingle();
    if (member?.tenant_id) return member.tenant_id;
  }

  const customer = await stripe.customers.retrieve(customerId);
  const email = !customer.deleted && "email" in customer ? customer.email : null;
  if (email) {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (user?.id) {
      const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (member?.tenant_id) return member.tenant_id;
    }
  }

  return null;
}

async function tenantExists(tenantId?: string | null) {
  if (!tenantId) return false;
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function inferPlanId(subscription: Stripe.Subscription): Promise<string | null> {
  const price = subscription.items.data[0]?.price;
  if (!price) return null;

  const { data: byMonthlyPrice } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("stripe_price_id_monthly", price.id)
    .maybeSingle();

  if (byMonthlyPrice?.id) return byMonthlyPrice.id;

  const { data: byAnnualPrice } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("stripe_price_id_annually", price.id)
    .maybeSingle();

  if (byAnnualPrice?.id) return byAnnualPrice.id;

  if (await planExists(price.metadata?.planId)) return price.metadata.planId;

  const expandedProduct = typeof price.product === "object" && price.product && !("deleted" in price.product)
    ? price.product as Stripe.Product
    : null;
  const productId = typeof price.product === "string" ? price.product : expandedProduct?.id;
  if (!productId || typeof productId !== "string") return null;

  const { data } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("stripe_product_id", productId)
    .maybeSingle();

  if (data?.id) return data.id;

  if (await planExists(expandedProduct?.metadata?.planId)) return expandedProduct!.metadata.planId;

  const product = await stripe.products.retrieve(productId);
  if (!product.deleted && await planExists(product.metadata?.planId)) {
    return product.metadata.planId;
  }

  return null;
}

async function planExists(planId?: string | null): Promise<boolean> {
  if (!planId) return false;

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    console.warn(`[stripe-webhook] could not verify plan ${planId}:`, error.message);
  }

  return Boolean(data?.id || FALLBACK_PLAN_CREDIT_LIMITS[planId] !== undefined);
}

async function getLocalSubscription(tenantId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function shouldResetCreditsForPeriod(existing: any, subscription: Stripe.Subscription) {
  const localPeriodStart = parseDateSeconds(existing?.current_period_start);
  const stripePeriodStart = subscription.current_period_start || null;

  return Boolean(
    localPeriodStart &&
    stripePeriodStart &&
    localPeriodStart !== stripePeriodStart
  );
}

function parseDateSeconds(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number") return Math.floor(value);
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed / 1000);
}

async function getPlanCreditLimit(planId?: string | null): Promise<number | null> {
  if (!planId) return null;

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("limits")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    console.warn(`[stripe-webhook] could not load credit limit for plan ${planId}:`, error.message);
  }

  const fromDb = Number(data?.limits?.maxAiCredits);
  if (Number.isFinite(fromDb) && fromDb >= 0) return fromDb;

  return FALLBACK_PLAN_CREDIT_LIMITS[planId] ?? null;
}

async function getTenantPlanId(tenantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("subscription_plan")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    console.warn(`[stripe-webhook] could not load tenant plan for ${tenantId}:`, error.message);
    return null;
  }

  return data?.subscription_plan || null;
}

async function resolvePreviousPlanCreditLimit(params: {
  tenantId: string;
  targetPlanId: string;
  currentIncluded: number;
  current: any;
  previousPlanId?: string | null;
}): Promise<number> {
  const tenantPlanId = await getTenantPlanId(params.tenantId);
  const candidates = [
    typeof params.current?.planId === "string" ? params.current.planId : null,
    params.previousPlanId,
    tenantPlanId,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate === params.targetPlanId) continue;
    const credits = await getPlanCreditLimit(candidate);
    if (credits !== null) return credits;
  }

  for (const candidate of candidates) {
    const credits = await getPlanCreditLimit(candidate);
    if (credits !== null && credits <= params.currentIncluded) return credits;
  }

  const recordedBase = Number(params.current?.planCreditsIncluded);
  if (Number.isFinite(recordedBase) && recordedBase >= 0) return recordedBase;

  return Math.max(0, params.currentIncluded);
}

async function normalizedCreditsUsage(
  tenantId: string,
  planId: string,
  current: any,
  options: {
    previousPlanId?: string | null;
    currentPeriodStart?: number | null;
    currentPeriodEnd?: number | null;
    resetPeriod?: boolean;
  } = {},
) {
  const planCreditsIncluded = await getPlanCreditLimit(planId) ?? 0;
  const now = Date.now();
  const currentIncluded = Number(current?.creditsIncluded || 0);
  const previousPlanCredits = await resolvePreviousPlanCreditLimit({
    tenantId,
    targetPlanId: planId,
    currentIncluded,
    current,
    previousPlanId: options.previousPlanId,
  });
  const extraCredits = Math.max(0, currentIncluded - previousPlanCredits);
  const creditsIncluded = planCreditsIncluded + extraCredits;
  const creditsUsed = options.resetPeriod
    ? 0
    : Number(current?.creditsUsed || current?.total_used || 0);
  const periodStartSeconds = options.currentPeriodStart || current?.periodStart?.seconds || Math.floor(now / 1000);
  const periodEndSeconds = options.currentPeriodEnd || current?.periodEnd?.seconds || Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000);

  return {
    ...(current || {}),
    tenantId,
    planId,
    planCreditsIncluded,
    periodStart: { seconds: periodStartSeconds, nanoseconds: 0 },
    periodEnd: { seconds: periodEndSeconds, nanoseconds: 0 },
    creditsIncluded,
    creditsUsed,
    creditsRemaining: Math.max(0, creditsIncluded - creditsUsed),
    creditsOverage: Math.max(0, creditsUsed - creditsIncluded),
    usageByOperation: options.resetPeriod ? {} : current?.usageByOperation || {},
    dailyUsage: options.resetPeriod ? [] : Array.isArray(current?.dailyUsage) ? current.dailyUsage : [],
    subClientsUsage: options.resetPeriod ? {} : current?.subClientsUsage,
    lastUpdated: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
  };
}

async function addPurchasedCredits(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId || session.metadata?.clientTenantId;
  const creditsAmount = Number(session.metadata?.credits || 0);
  if (!tenantId || creditsAmount <= 0) return;

  const subscription = await getLocalSubscription(tenantId);
  const current = subscription?.ai_credits_usage;
  if (!current) return;

  const updated = {
    ...current,
    creditsIncluded: Number(current.creditsIncluded || 0) + creditsAmount,
    creditsRemaining: Number(current.creditsRemaining || 0) + creditsAmount,
    lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
  };

  await supabase
    .from("subscriptions")
    .update({ ai_credits_usage: updated, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const order = await findStoreOrderForPaymentIntent(paymentIntent);
  if (!order) return;

  const paidAt = new Date().toISOString();
  const orderData = order.data || {};
  const stripeData = orderData.stripe || {};
  const chargeId = typeof paymentIntent.latest_charge === "string"
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id;
  const paidOrderData = {
    ...orderData,
    status: "processing",
    paymentStatus: "paid",
    paidAt,
    stripe: {
      ...stripeData,
      paymentIntentId: paymentIntent.id,
      chargeId: chargeId || stripeData.chargeId,
    },
    updatedAt: paidAt,
  };

  await supabase
    .from("store_orders")
    .update({
      status: "processing",
      payment_status: "paid",
      payment_intent_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: paidAt,
      updated_at: paidAt,
      stripe: {
        ...stripeData,
        paymentIntentId: paymentIntent.id,
        chargeId: chargeId || stripeData.chargeId,
      },
      data: paidOrderData,
    })
    .eq("id", order.id);

  const paidOrder = {
    ...order,
    status: "processing",
    payment_status: "paid",
    payment_intent_id: paymentIntent.id,
    stripe_payment_intent_id: paymentIntent.id,
    paid_at: paidAt,
    data: paidOrderData,
  };

  const committedReservations = await commitInventoryReservationsForPaidOrder(paidOrder, paymentIntent.id, paidAt);
  if (!committedReservations) {
    await decrementInventoryForPaidOrder(paidOrder, paymentIntent.id, paidAt);
  }

  await incrementDiscountUsageForPaidOrder(order.id, paidAt);
  await updateCustomerAccountStatsForPaidOrder(paidOrder, paidAt);

  try {
    const emailResults = await sendPaidOrderTransactionalEmails({
      supabase,
      order: {
        ...paidOrder,
      },
      paidAt,
      providerEventId: paymentIntent.id,
      resendApiKey: RESEND_API_KEY,
      defaultFromEmail: DEFAULT_FROM_EMAIL,
    });
    console.log("[stripe-webhook] ecommerce email results:", emailResults);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : String(emailError);
    console.error("[stripe-webhook] ecommerce transactional emails failed:", message);
  }
}

function readOrderItems(order: any): any[] {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.data?.items)) return order.data.items;
  return [];
}

function readOrderCheckoutIdempotencyKey(order: any): string | null {
  return order.checkout_idempotency_key || order.data?.checkoutIdempotencyKey || null;
}

async function loadInventoryReservationsForOrder(order: any, paymentIntentId?: string | null, statuses = ["active", "committed"]) {
  const reservationsById = new Map<string, any>();

  const addReservations = (rows: any[] | null) => {
    for (const row of rows || []) {
      if (row?.id) reservationsById.set(row.id, row);
    }
  };

  if (order.id) {
    const { data, error } = await supabase
      .from("store_inventory_reservations")
      .select("*")
      .eq("order_id", String(order.id))
      .in("status", statuses);
    if (error) throw error;
    addReservations(data);
  }

  if (paymentIntentId) {
    const { data, error } = await supabase
      .from("store_inventory_reservations")
      .select("*")
      .eq("payment_intent_id", paymentIntentId)
      .in("status", statuses);
    if (error) throw error;
    addReservations(data);
  }

  const checkoutIdempotencyKey = readOrderCheckoutIdempotencyKey(order);
  if (checkoutIdempotencyKey) {
    const { data, error } = await supabase
      .from("store_inventory_reservations")
      .select("*")
      .eq("checkout_idempotency_key", checkoutIdempotencyKey)
      .in("status", statuses);
    if (error) throw error;
    addReservations(data);
  }

  return Array.from(reservationsById.values());
}

async function persistOrderInventoryMetadata(order: any, inventoryUpdate: Record<string, unknown>, updatedAt: string) {
  const { data: latestOrder, error } = await supabase
    .from("store_orders")
    .select("data")
    .eq("id", order.id)
    .maybeSingle();
  if (error) throw error;

  const latestData = latestOrder?.data || order.data || {};
  const { error: updateError } = await supabase
    .from("store_orders")
    .update({
      data: {
        ...latestData,
        inventory: {
          ...(latestData.inventory || {}),
          ...inventoryUpdate,
        },
        updatedAt,
      },
      updated_at: updatedAt,
    })
    .eq("id", order.id);
  if (updateError) throw updateError;
}

async function commitInventoryReservationsForPaidOrder(order: any, paymentIntentId: string, paidAt: string): Promise<boolean> {
  const reservations = await loadInventoryReservationsForOrder(order, paymentIntentId, ["active", "committed"]);
  if (reservations.length === 0) return false;

  const committedReservations: any[] = [];
  for (const reservation of reservations) {
    const { data, error } = await supabase.rpc("commit_store_inventory_reservation", {
      p_reservation_id: reservation.id,
      p_order_id: String(order.id),
      p_payment_intent_id: paymentIntentId,
      p_idempotency_key: `inventory:movement:commit:${reservation.id}:${paymentIntentId}`,
      p_committed_at: paidAt,
    });
    if (error) throw error;
    committedReservations.push(data || reservation);
  }

  await persistOrderInventoryMetadata(order, {
    reservationIds: committedReservations.map((reservation) => reservation.id).filter(Boolean),
    committedAt: paidAt,
    paymentIntentId,
  }, paidAt);

  return true;
}

async function releaseInventoryReservationsForOrder(
  order: any,
  paymentIntentId: string,
  releasedAt: string,
  reason: string,
) {
  const reservations = await loadInventoryReservationsForOrder(order, paymentIntentId, ["active"]);
  if (reservations.length === 0) return;

  for (const reservation of reservations) {
    const { error } = await supabase.rpc("release_store_inventory_reservation", {
      p_reservation_id: reservation.id,
      p_status: "released",
      p_reason: reason,
      p_released_at: releasedAt,
    });
    if (error) throw error;
  }

  await persistOrderInventoryMetadata(order, {
    releasedAt,
    releaseReason: reason,
    paymentIntentId,
  }, releasedAt);
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function readProductData(row: any): Record<string, any> {
  return row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : {};
}

function isInventoryTracked(row: any): boolean {
  const data = readProductData(row);
  return (row.track_inventory ?? data.trackInventory ?? data.track_inventory ?? true) !== false;
}

function readProductVariants(row: any): any[] {
  const data = readProductData(row);
  if (Array.isArray(row.variants)) return row.variants;
  if (Array.isArray(data.variants)) return data.variants;
  return [];
}

async function fetchStoreProduct(productId: string, projectId?: string | null) {
  let query = supabase
    .from("store_products")
    .select("*")
    .eq("id", productId);
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function decrementSimpleProductInventory(
  product: any,
  quantity: number,
  paidAt: string,
) {
  const productData = readProductData(product);
  const currentQuantity = asNumber(product.quantity ?? product.inventory_quantity ?? productData.quantity ?? productData.inventoryQuantity, 0);
  const nextQuantity = Math.max(0, currentQuantity - quantity);
  const nextData = {
    ...productData,
    quantity: nextQuantity,
    inventoryQuantity: nextQuantity,
    updatedAt: paidAt,
  };

  const { error } = await supabase
    .from("store_products")
    .update({
      quantity: nextQuantity,
      inventory_quantity: nextQuantity,
      data: nextData,
      updated_at: paidAt,
    })
    .eq("id", product.id);
  if (error) throw error;

  return {
    key: `${product.id}:default`,
    productId: product.id,
    previousQuantity: currentQuantity,
    nextQuantity,
    quantityDecremented: quantity,
  };
}

async function decrementVariantInventory(
  product: any,
  variantId: string,
  quantity: number,
  paidAt: string,
) {
  const productData = readProductData(product);
  const variants = readProductVariants(product);
  let matched = false;
  let previousQuantity = 0;
  let nextQuantity = 0;

  const nextVariants = variants.map((variant) => {
    if (String(variant?.id) !== String(variantId)) return variant;
    matched = true;
    previousQuantity = asNumber(variant.quantity, 0);
    nextQuantity = Math.max(0, previousQuantity - quantity);
    return {
      ...variant,
      quantity: nextQuantity,
    };
  });

  if (!matched) return null;

  const { error } = await supabase
    .from("store_products")
    .update({
      variants: nextVariants,
      data: {
        ...productData,
        variants: nextVariants,
        updatedAt: paidAt,
      },
      updated_at: paidAt,
    })
    .eq("id", product.id);
  if (error) throw error;

  return {
    key: `${product.id}:${variantId}`,
    productId: product.id,
    variantId,
    previousQuantity,
    nextQuantity,
    quantityDecremented: quantity,
  };
}

async function persistOrderInventoryState(
  order: any,
  orderData: Record<string, any>,
  inventoryState: Record<string, any>,
  paidAt: string,
) {
  const { error } = await supabase
    .from("store_orders")
    .update({
      data: {
        ...orderData,
        inventory: inventoryState,
        updatedAt: paidAt,
      },
      updated_at: paidAt,
    })
    .eq("id", order.id);
  if (error) throw error;
}

function normalizeDiscountCode(code: unknown) {
  return String(code || "").trim().toUpperCase();
}

async function findOrderDiscount(orderData: Record<string, any>, order: any) {
  const discountId = orderData.discountRule?.id || orderData.pricing?.discount?.id;
  const discountCode = normalizeDiscountCode(orderData.discountCode || order.discount_code || orderData.pricing?.discountCode);
  const projectId = order.project_id || order.projectId || orderData.projectId;

  if (discountId) {
    const { data, error } = await supabase
      .from("store_discounts")
      .select("*")
      .eq("id", discountId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  if (!projectId || !discountCode) return null;
  const { data, error } = await supabase
    .from("store_discounts")
    .select("*")
    .eq("project_id", projectId)
    .ilike("code", discountCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function incrementDiscountUsageForPaidOrder(orderId: string, paidAt: string) {
  const { data: order, error: orderError } = await supabase
    .from("store_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return;

  const orderData = order.data || {};
  if (orderData.discountUsage?.incrementedAt) return;

  const discountCode = normalizeDiscountCode(orderData.discountCode || order.discount_code || orderData.pricing?.discountCode);
  if (!discountCode && !orderData.discountRule?.id && !orderData.pricing?.discount?.id) return;

  const discount = await findOrderDiscount(orderData, order);
  if (!discount) {
    await supabase
      .from("store_orders")
      .update({
        data: {
          ...orderData,
          discountUsage: {
            code: discountCode || null,
            warning: "Discount record was not found when payment was confirmed.",
            checkedAt: paidAt,
          },
          updatedAt: paidAt,
        },
        updated_at: paidAt,
      })
      .eq("id", order.id);
    return;
  }

  const discountData = readProductData(discount);
  const nextUsedCount = asNumber(discount.used_count ?? discountData.usedCount, 0) + 1;
  const { error: discountError } = await supabase
    .from("store_discounts")
    .update({
      used_count: nextUsedCount,
      data: {
        ...discountData,
        usedCount: nextUsedCount,
        lastUsedAt: paidAt,
      },
      updated_at: paidAt,
    })
    .eq("id", discount.id);
  if (discountError) throw discountError;

  const { error: orderUpdateError } = await supabase
    .from("store_orders")
    .update({
      data: {
        ...orderData,
        discountUsage: {
          discountId: discount.id,
          code: normalizeDiscountCode(discount.code || discountData.code || discountCode),
          incrementedAt: paidAt,
        },
        updatedAt: paidAt,
      },
      updated_at: paidAt,
    })
    .eq("id", order.id);
  if (orderUpdateError) throw orderUpdateError;
}

async function updateCustomerAccountStatsForPaidOrder(order: any, paidAt: string) {
  const orderData = order.data || {};
  if (orderData.customerStats?.updatedAt) return;

  const customerId = order.customer_id || orderData.customerId;
  const orderTotal = asNumber(order.total_amount ?? order.total ?? orderData.total);
  let customer = null;

  if (customerId) {
    const { data, error } = await supabase
      .from("store_customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    if (error) throw error;
    customer = data;
  }

  if (!customer && order.project_id && order.customer_email) {
    const { data, error } = await supabase
      .from("store_customers")
      .select("*")
      .eq("project_id", order.project_id)
      .ilike("email", order.customer_email)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    customer = data;
  }

  if (customer) {
    const customerData = customer.data || {};
    const nextTotalOrders = asNumber(customer.total_orders ?? customerData.totalOrders) + 1;
    const nextTotalSpent = Math.round((asNumber(customer.total_spent ?? customerData.totalSpent) + orderTotal) * 100) / 100;
    const { error } = await supabase
      .from("store_customers")
      .update({
        total_orders: nextTotalOrders,
        total_spent: nextTotalSpent,
        last_order_at: paidAt,
        data: {
          ...customerData,
          totalOrders: nextTotalOrders,
          totalSpent: nextTotalSpent,
          lastOrderAt: paidAt,
          updatedAt: paidAt,
        },
        updated_at: paidAt,
      })
      .eq("id", customer.id);
    if (error) throw error;
  }

  let storeUserQuery = supabase.from("store_users").select("*");
  if (order.user_id) {
    storeUserQuery = storeUserQuery.eq("auth_user_id", order.user_id);
  } else if (order.project_id && order.customer_email) {
    storeUserQuery = storeUserQuery.eq("project_id", order.project_id).ilike("email", order.customer_email);
  } else {
    storeUserQuery = storeUserQuery.eq("id", "__missing__");
  }
  const { data: storeUser, error: storeUserReadError } = await storeUserQuery
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (storeUserReadError) throw storeUserReadError;

  if (storeUser) {
    const totalOrders = asNumber(storeUser.total_orders) + 1;
    const totalSpent = Math.round((asNumber(storeUser.total_spent) + orderTotal) * 100) / 100;
    const averageOrderValue = totalOrders > 0 ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0;
    const { error } = await supabase
      .from("store_users")
      .update({
        customer_id: customer?.id || storeUser.customer_id || null,
        total_orders: totalOrders,
        total_spent: totalSpent,
        average_order_value: averageOrderValue,
        last_order_at: paidAt,
        updated_at: paidAt,
      })
      .eq("id", storeUser.id);
    if (error) throw error;
  }

  const { data: latestOrder } = await supabase
    .from("store_orders")
    .select("data")
    .eq("id", order.id)
    .maybeSingle();
  const latestOrderData = latestOrder?.data || orderData;

  await supabase
    .from("store_orders")
    .update({
      customer_id: customer?.id || customerId || null,
      data: {
        ...latestOrderData,
        customerId: customer?.id || customerId || null,
        customerStats: {
          updatedAt: paidAt,
          customerId: customer?.id || customerId || null,
        },
        updatedAt: paidAt,
      },
      updated_at: paidAt,
    })
    .eq("id", order.id);
}

async function decrementInventoryForPaidOrder(order: any, paymentIntentId: string, paidAt: string) {
  const orderData = order.data || {};
  if (orderData.inventory?.decrementedAt) return;

  const items = readOrderItems(order);
  const inventoryState = orderData.inventory || {};
  const adjustments: any[] = Array.isArray(inventoryState.adjustments) ? [...inventoryState.adjustments] : [];
  const warnings: string[] = Array.isArray(inventoryState.warnings) ? [...inventoryState.warnings] : [];
  const adjustedKeys = new Set(adjustments.map((adjustment) => adjustment?.key).filter(Boolean));

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rawProductId = item.productId || item.product_id;
    const productId = rawProductId ? String(rawProductId) : "";
    const quantity = asNumber(item.quantity, 0);
    if (!productId || quantity <= 0) continue;
    const variantId = item.variantId || item.variant_id;
    const adjustmentKey = `${productId}:${variantId || "default"}`;
    if (adjustedKeys.has(adjustmentKey)) continue;

    const product = await fetchStoreProduct(productId, order.project_id || order.projectId);
    if (!product) {
      warnings.push(`Product ${productId} was not found during inventory decrement.`);
      continue;
    }
    if (!isInventoryTracked(product)) continue;

    if (variantId) {
      const adjustment = await decrementVariantInventory(product, String(variantId), quantity, paidAt);
      if (adjustment) {
        adjustments.push(adjustment);
        adjustedKeys.add(adjustment.key);
        await persistOrderInventoryState(order, orderData, {
          ...inventoryState,
          decrementStartedAt: inventoryState.decrementStartedAt || paidAt,
          paymentIntentId,
          adjustments,
          warnings,
        }, paidAt);
      } else {
        warnings.push(`Variant ${variantId} for product ${productId} was not found during inventory decrement.`);
      }
      continue;
    }

    const adjustment = await decrementSimpleProductInventory(product, quantity, paidAt);
    adjustments.push(adjustment);
    adjustedKeys.add(adjustment.key);
    await persistOrderInventoryState(order, orderData, {
      ...inventoryState,
      decrementStartedAt: inventoryState.decrementStartedAt || paidAt,
      paymentIntentId,
      adjustments,
      warnings,
    }, paidAt);
  }

  await persistOrderInventoryState(order, orderData, {
    ...inventoryState,
    decrementStartedAt: inventoryState.decrementStartedAt || paidAt,
    decrementedAt: paidAt,
    paymentIntentId,
    adjustments,
    warnings,
  }, paidAt);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const order = await findStoreOrderForPaymentIntent(paymentIntent);
  if (!order) return;

  const failedAt = new Date().toISOString();
  const orderData = order.data || {};
  const stripeData = orderData.stripe || {};
  const nextStatus = paymentIntent.status === "canceled" ? "cancelled" : (order.status || orderData.status || "pending");
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    payment_status: "failed",
    payment_intent_id: paymentIntent.id,
    stripe_payment_intent_id: paymentIntent.id,
    updated_at: failedAt,
    stripe: {
      ...stripeData,
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    },
    data: {
      ...orderData,
      status: nextStatus,
      paymentStatus: "failed",
      stripe: {
        ...stripeData,
        paymentIntentId: paymentIntent.id,
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
      },
      updatedAt: failedAt,
    },
  };

  if (nextStatus === "cancelled") {
    updatePayload.cancelled_at = failedAt;
    updatePayload.data = {
      ...(updatePayload.data as Record<string, unknown>),
      cancelledAt: failedAt,
    };
  }

  await supabase
    .from("store_orders")
    .update(updatePayload)
    .eq("id", order.id);

  await releaseInventoryReservationsForOrder(
    {
      ...order,
      status: nextStatus,
      payment_status: "failed",
      payment_intent_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      data: updatePayload.data,
    },
    paymentIntent.id,
    failedAt,
    nextStatus === "cancelled" ? "payment_intent_cancelled" : "payment_intent_failed",
  );

  try {
    const emailResult = await sendPaymentFailedTransactionalEmail({
      supabase,
      order: {
        ...order,
        status: nextStatus,
        payment_status: "failed",
        payment_intent_id: paymentIntent.id,
        stripe_payment_intent_id: paymentIntent.id,
        data: updatePayload.data as Record<string, unknown>,
      },
      failedAt,
      eventId: paymentIntent.id,
      resendApiKey: RESEND_API_KEY,
      defaultFromEmail: DEFAULT_FROM_EMAIL,
    });
    console.log("[stripe-webhook] ecommerce payment failed email result:", emailResult);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : String(emailError);
    console.error("[stripe-webhook] ecommerce payment failed email failed:", message);
  }
}

async function findStoreOrderForPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const { orderId, orderNumber, storeId, projectId } = paymentIntent.metadata;

  if (orderId) {
    const { data } = await supabase
      .from("store_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (data) return data;
  }

  let query = supabase
    .from("store_orders")
    .select("*")
    .or(`payment_intent_id.eq.${paymentIntent.id},stripe_payment_intent_id.eq.${paymentIntent.id}`);
  if (projectId) query = query.eq("project_id", projectId);
  const { data: byPaymentIntent } = await query.maybeSingle();
  if (byPaymentIntent) return byPaymentIntent;

  if (orderNumber) {
    let orderNumberQuery = supabase.from("store_orders").select("*").eq("order_number", orderNumber);
    if (projectId) orderNumberQuery = orderNumberQuery.eq("project_id", projectId);
    const { data } = await orderNumberQuery.maybeSingle();
    if (data) return data;
  }

  if (storeId && orderId) {
    const { data } = await supabase
      .from("store_orders")
      .select("*")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

function readStoredRefunds(order: any): any[] {
  return Array.isArray(order?.data?.refunds) ? order.data.refunds : [];
}

function mergeRefundRecord(refunds: any[], nextRefund: any): any[] {
  const index = refunds.findIndex((refund) => refund?.id === nextRefund.id);
  if (index === -1) return [...refunds, nextRefund];
  return refunds.map((refund, refundIndex) => refundIndex === index ? { ...refund, ...nextRefund } : refund);
}

function sumActiveRefunds(refunds: any[]): number {
  const amount = refunds.reduce((sum, refund) => {
    const status = String(refund?.status || "").toLowerCase();
    if (["failed", "canceled", "cancelled"].includes(status)) return sum;
    return sum + asNumber(refund?.amount);
  }, 0);
  return Math.round(amount * 100) / 100;
}

function getChargePaymentIntentId(charge: Stripe.Charge): string | null {
  if (typeof charge.payment_intent === "string") return charge.payment_intent;
  return charge.payment_intent?.id || null;
}

async function findStoreOrderForCharge(charge: Stripe.Charge) {
  const metadataOrderId = charge.metadata?.orderId;
  if (metadataOrderId) {
    const { data } = await supabase
      .from("store_orders")
      .select("*")
      .eq("id", metadataOrderId)
      .maybeSingle();
    if (data) return data;
  }

  const paymentIntentId = getChargePaymentIntentId(charge);
  if (paymentIntentId) {
    const { data } = await supabase
      .from("store_orders")
      .select("*")
      .or(`payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase
    .from("store_orders")
    .select("*")
    .contains("stripe", { chargeId: charge.id })
    .maybeSingle();
  return data || null;
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const order = await findStoreOrderForCharge(charge);
  if (!order) return;

  const updatedAt = new Date().toISOString();
  const orderData = order.data || {};
  const stripeData = orderData.stripe || {};
  let refunds = readStoredRefunds(order);
  const chargeRefunds = charge.refunds?.data || [];

  for (const refund of chargeRefunds) {
    refunds = mergeRefundRecord(refunds, {
      id: refund.id,
      amount: Math.round((refund.amount / 100) * 100) / 100,
      status: refund.status || "unknown",
      reason: refund.reason || undefined,
      source: "stripe",
      createdAt: iso(refund.created) || updatedAt,
    });
  }

  const orderTotal = asNumber(order.total_amount ?? order.total ?? orderData.total);
  const refundedAmount = charge.amount_refunded
    ? Math.round((charge.amount_refunded / 100) * 100) / 100
    : sumActiveRefunds(refunds);
  const chargeTotal = charge.amount ? charge.amount / 100 : orderTotal;
  const isFullyRefunded = Boolean(charge.refunded) || (chargeTotal > 0 && refundedAmount >= chargeTotal - 0.005);
  const paymentStatus = isFullyRefunded ? "refunded" : "partially_refunded";
  const status = isFullyRefunded ? "refunded" : (order.status || orderData.status || "processing");
  const nextStripeData = {
    ...stripeData,
    paymentIntentId: getChargePaymentIntentId(charge) || stripeData.paymentIntentId,
    chargeId: charge.id,
    lastRefundId: chargeRefunds[0]?.id || stripeData.lastRefundId,
  };
  const nextData = {
    ...orderData,
    status,
    paymentStatus,
    refundedAmount,
    refunds,
    refundedAt: isFullyRefunded ? updatedAt : orderData.refundedAt,
    stripe: nextStripeData,
    updatedAt,
  };
  const updatePayload: Record<string, unknown> = {
    status,
    payment_status: paymentStatus,
    stripe: nextStripeData,
    data: nextData,
    updated_at: updatedAt,
  };
  if (isFullyRefunded) updatePayload.refunded_at = updatedAt;

  await supabase
    .from("store_orders")
    .update(updatePayload)
    .eq("id", order.id);

  try {
    const emailResult = await sendRefundTransactionalEmail({
      supabase,
      order: {
        ...order,
        ...updatePayload,
        refunded_amount: refundedAmount,
        data: nextData,
      },
      occurredAt: updatedAt,
      eventId: chargeRefunds[0]?.id || charge.id,
      providerEventId: chargeRefunds[0]?.id || charge.id,
      resendApiKey: RESEND_API_KEY,
      defaultFromEmail: DEFAULT_FROM_EMAIL,
    });
    console.log("[stripe-webhook] ecommerce refund email result:", emailResult);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : String(emailError);
    console.error("[stripe-webhook] ecommerce refund email failed:", message);
  }
}
