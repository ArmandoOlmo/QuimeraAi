import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

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

  try {
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
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        console.log(`[stripe-webhook] unhandled event type ${event.type}`);
    }

    return json({ received: true });
  } catch (error: any) {
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

  if (session.metadata?.type === "credit_package") {
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

  const planId = fallback?.planId || subscription.metadata?.planId || await inferPlanId(subscription) || "free";
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === "year" ? "annually" : "monthly";
  const existing = await getLocalSubscription(tenantId);
  const usage = await normalizedCreditsUsage(tenantId, planId, existing?.ai_credits_usage);
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
  const productId = subscription.items.data[0]?.price.product;
  if (!productId || typeof productId !== "string") return null;

  const { data } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("stripe_product_id", productId)
    .maybeSingle();

  return data?.id || null;
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

async function normalizedCreditsUsage(tenantId: string, planId: string, current: any) {
  if (
    current &&
    typeof current.creditsIncluded === "number" &&
    typeof current.creditsUsed === "number" &&
    typeof current.creditsRemaining === "number"
  ) {
    return current;
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("limits")
    .eq("id", planId)
    .maybeSingle();

  const creditsIncluded = Number(plan?.limits?.maxAiCredits || 0);
  const creditsUsed = Number(current?.creditsUsed || current?.total_used || 0);
  const now = Date.now();

  return {
    tenantId,
    periodStart: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
    periodEnd: { seconds: Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000), nanoseconds: 0 },
    creditsIncluded,
    creditsUsed,
    creditsRemaining: Math.max(0, creditsIncluded - creditsUsed),
    creditsOverage: Math.max(0, creditsUsed - creditsIncluded),
    usageByOperation: current?.usageByOperation || {},
    dailyUsage: Array.isArray(current?.dailyUsage) ? current.dailyUsage : [],
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

  await supabase
    .from("store_orders")
    .update({
      status: "processing",
      payment_status: "paid",
      data: {
        ...(order.data || {}),
        status: "processing",
        paymentStatus: "paid",
        updatedAt: new Date().toISOString(),
      },
    })
    .eq("id", order.id);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const order = await findStoreOrderForPaymentIntent(paymentIntent);
  if (!order) return;

  await supabase
    .from("store_orders")
    .update({
      payment_status: "failed",
      data: {
        ...(order.data || {}),
        paymentStatus: "failed",
        updatedAt: new Date().toISOString(),
      },
    })
    .eq("id", order.id);
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
    .eq("payment_intent_id", paymentIntent.id);
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

async function handleChargeRefunded(_charge: Stripe.Charge) {
  // Store-order refund handling can be added here once refunds are surfaced in the UI.
}
