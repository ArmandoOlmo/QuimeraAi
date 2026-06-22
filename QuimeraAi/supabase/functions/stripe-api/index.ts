import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";
import {
  calculateCartSubtotal as calculateServerCartSubtotal,
  calculateCheckoutTotals as calculateServerCheckoutTotals,
} from "../../../utils/ecommerce/ecommercePricingService.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type BillingCycle = "monthly" | "annually";

const PLAN_NAME_BY_ID: Record<string, string> = {
  individual: "Individual",
  agency_starter: "Agency Starter",
  agency_pro: "Agency Pro",
  agency_scale: "Agency Scale",
  enterprise: "Enterprise",
};

const CREDIT_PACKAGES: Record<string, { name: string; credits: number; price: number }> = {
  pack_100: { name: "100 Credits", credits: 100, price: 5 },
  pack_500: { name: "500 Credits", credits: 500, price: 20 },
  pack_2000: { name: "2,000 Credits", credits: 2000, price: 60 },
  pack_5000: { name: "5,000 Credits", credits: 5000, price: 125 },
  pack_10000: { name: "10,000 Credits", credits: 10000, price: 200 },
};

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

const PUBLIC_ACTIONS = new Set([
  "agencyBilling-getPaymentLinkInfo",
  "agencyBilling-confirmClientPayment",
  "createStoreCheckoutIntent",
  "validateStoreDiscount",
  "getStoreOrderStatus",
  "trackOrder",
  "storeUsers-create",
  "storeUsers-recordLogin",
  "storeUsers-resetPassword",
]);

const SERVICE_ROLE_ACTIONS = new Set([
  "syncStripeSubscription",
  "syncStripeSubscriptions",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();
    const isPublicAction = PUBLIC_ACTIONS.has(action) || (action === "createCheckoutSession" && !payload.planId);
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.replace("Bearer ", "") || "";
    const isServiceRoleRequest = Boolean(
      bearerToken &&
      bearerToken === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") &&
      SERVICE_ROLE_ACTIONS.has(action)
    );
    const syncSecret = Deno.env.get("STRIPE_SYNC_SECRET");
    const isSyncSecretRequest = Boolean(
      syncSecret &&
      req.headers.get("x-stripe-sync-secret") === syncSecret &&
      SERVICE_ROLE_ACTIONS.has(action)
    );
    const isTrustedServerRequest = isServiceRoleRequest || isSyncSecretRequest;
    let user: any = null;

    if (bearerToken && !isTrustedServerRequest) {
      const { data, error: authError } = await supabase.auth.getUser(bearerToken);
      if (!authError && data.user) user = data.user;
    }

    if (!isPublicAction && !user && !isTrustedServerRequest) throw new Error("Invalid or missing user token");
    let result;

    switch (action) {
      case "createPaymentIntent":
        result = await createPaymentIntent(user.id, payload);
        break;
      case "createCheckoutSession":
        if (!payload.planId) {
          result = await createStoreCheckoutSession(payload);
          break;
        }
      case "createSubscriptionCheckout":
        result = await createSubscriptionCheckout(user, payload);
        break;
      case "createBillingPortalSession":
      case "createCustomerPortalSession":
        result = await createBillingPortalSession(user.id, payload);
        break;
      case "getSubscriptionDetails":
        result = await getSubscriptionDetails(user.id, payload);
        break;
      case "syncStripeSubscription":
      case "syncStripeSubscriptions":
        result = await syncStripeSubscriptions(user?.id, isTrustedServerRequest, payload);
        break;
      case "createOrUpdatePlan":
        result = await createOrUpdatePlan(user.id, payload);
        break;
      case "archivePlan":
        result = await archivePlan(user.id, payload);
        break;
      case "updateSubscription":
        result = await updateSubscription(user.id, payload);
        break;
      case "cancelSubscription":
        result = await cancelSubscription(user.id, payload);
        break;
      case "reactivateSubscription":
        result = await reactivateSubscription(user.id, payload);
        break;
      case "createCreditPackageCheckout":
        result = await createCreditPackageCheckout(user.id, payload);
        break;
      case "getStripeConnectStatus":
        result = await getStripeConnectStatus(user.id, payload);
        break;
      case "createStripeConnectAccount":
        result = await createStripeConnectAccount(user.id, payload);
        break;
      case "updateClientMonthlyPrice":
        result = await updateClientMonthlyPrice(user.id, payload);
        break;
      case "updateSubscriptionAddons":
        result = await updateSubscriptionAddons(user.id, payload);
        break;
      case "getAddonsPricing":
        result = await getAddonsPricing();
        break;
      case "createRefund":
        result = await createRefund(user.id, payload);
        break;
      case "cancelStoreOrder":
        result = await cancelStoreOrder(user.id, payload);
        break;
      case "getPaymentStatus":
        result = await getPaymentStatus(user.id, payload);
        break;
      case "createStoreCheckoutIntent":
        result = await createStoreCheckoutIntent(payload, user?.id || null);
        break;
      case "validateStoreDiscount":
        result = await validateStoreDiscount(payload);
        break;
      case "getStoreOrderStatus":
      case "trackOrder":
        result = await getStoreOrderStatus(payload);
        break;
      case "storeUsers-create":
        result = await createStoreUser(payload);
        break;
      case "storeUsers-getCurrent":
        result = await getCurrentStoreUser(user.id, payload);
        break;
      case "storeUsers-updateProfile":
        result = await updateCurrentStoreUser(user.id, payload);
        break;
      case "storeUsers-deleteAccount":
        result = await deleteCurrentStoreUser(user.id, payload);
        break;
      case "storeUsers-recordLogin":
        result = await recordStoreUserLogin(payload);
        break;
      case "storeUsers-resetPassword":
        result = await resetStoreUserPassword(payload);
        break;
      case "createConnectAccount":
        result = await createConnectAccount(user.id, payload);
        break;
      case "createConnectOnboardingLink":
        result = await createConnectOnboardingLink(user.id, payload);
        break;
      case "createConnectLoginLink":
        result = await createConnectLoginLink(user.id, payload);
        break;
      case "getConnectAccountStatus":
        result = await getConnectAccountStatus(user.id, payload);
        break;
      case "disconnectConnectAccount":
        result = await disconnectConnectAccount(user.id, payload);
        break;
      case "createConnectPaymentIntent":
        result = await createConnectPaymentIntent(user.id, payload);
        break;
      case "agencyBilling-createClientPaymentLink":
        result = await createClientPaymentLink(user.id, payload);
        break;
      case "agencyBilling-getPaymentLinkInfo":
        result = await getPaymentLinkInfo(payload);
        break;
      case "agencyBilling-confirmClientPayment":
        result = await confirmClientPayment(payload);
        break;
      case "getAgencyBillingSummary":
        result = await getAgencyBillingSummary(user.id, payload);
        break;
      case "updateAgencyProjectCount":
        result = await updateAgencyProjectCount(user.id, payload);
        break;
      case "updateTenantLimits":
        result = await updateTenantLimits(user.id, payload);
        break;
      case "setupClientBilling":
        result = await setupClientBilling(user.id, payload);
        break;
      case "cancelClientSubscription":
        result = await cancelClientSubscription(user.id, payload);
        break;
      default:
        throw new Error("Unknown action");
    }

    return json({ data: result });
  } catch (error: any) {
    console.error("[stripe-api]", error);
    return json({ error: error.message || "Stripe API error" }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isoFromStripe(timestamp?: number | null): string | null {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

async function requireTenantAccess(userId: string, tenantId?: string | null) {
  let query = supabase
    .from("tenant_members")
    .select("tenant_id, role, tenant:tenants(*)")
    .eq("user_id", userId);

  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.tenant) throw new Error("No tienes acceso a este workspace");

  return data as any;
}

async function getPlan(planId: string) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Plan not found: ${planId}`);
  return data;
}

async function resolvePriceId(planId: string, billingCycle: BillingCycle): Promise<string> {
  const plan = await getPlan(planId);
  const dbPriceId = billingCycle === "annually"
    ? plan.stripe_price_id_annually
    : plan.stripe_price_id_monthly;

  if (dbPriceId) return dbPriceId;

  const interval = billingCycle === "annually" ? "year" : "month";

  if (plan.stripe_product_id) {
    const prices = await stripe.prices.list({
      product: plan.stripe_product_id,
      active: true,
      limit: 100,
    });
    const price = prices.data.find((item) => item.recurring?.interval === interval);
    if (price) return price.id;
  }

  const productName = PLAN_NAME_BY_ID[planId] || plan.name;
  const products = await stripe.products.search({
    query: `name:'${String(productName).replace(/'/g, "\\'")}'`,
    limit: 10,
  });
  const product = products.data.find((item) => item.active && item.name === productName) || products.data[0];
  if (product) {
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    const price = prices.data.find((item) => item.recurring?.interval === interval);
    if (price) {
      const update: Record<string, string> = { stripe_product_id: product.id };
      if (billingCycle === "annually") update.stripe_price_id_annually = price.id;
      else update.stripe_price_id_monthly = price.id;
      await supabase.from("subscription_plans").update(update).eq("id", planId);
      return price.id;
    }
  }

  throw new Error(`No Stripe price configured for ${planId} (${billingCycle})`);
}

async function getOrCreateCustomer(user: any, tenant: any, subscription: any) {
  if (subscription?.stripe_customer_id) {
    return stripe.customers.retrieve(subscription.stripe_customer_id) as Promise<Stripe.Customer>;
  }

  const email = user.email || tenant.email;
  if (email) {
    const found = await stripe.customers.search({
      query: `email:'${String(email).replace(/'/g, "\\'")}'`,
      limit: 1,
    });
    if (found.data[0]) return found.data[0];
  }

  return stripe.customers.create({
    email,
    name: tenant.branding?.companyName || tenant.name,
    metadata: { userId: user.id, tenantId: tenant.id },
  });
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

async function requirePlatformAdmin(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!["owner", "superadmin", "admin"].includes(data?.role || "")) {
    throw new Error("No tienes permiso para administrar planes");
  }
}

async function createPaymentIntent(userId: string, data: any) {
  const { amount, currency = "usd", metadata } = data;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100),
    currency,
    metadata: { ...metadata, userId },
  });

  return { clientSecret: paymentIntent.client_secret };
}

async function createOrUpdatePlan(userId: string, data: any) {
  await requirePlatformAdmin(userId);
  const { plan } = data;
  if (!plan?.id || !plan?.name || !plan?.price) {
    throw new Error("plan.id, plan.name and plan.price are required");
  }

  let productId = plan.stripeProductId;
  if (productId) {
    await stripe.products.update(productId, {
      name: plan.name,
      description: plan.description || undefined,
      active: !plan.isArchived,
      metadata: {
        planId: plan.id,
        featured: String(Boolean(plan.isFeatured)),
        features: Array.isArray(plan.features) ? plan.features.join(",") : "",
      },
    });
  } else {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      active: !plan.isArchived,
      metadata: {
        planId: plan.id,
        featured: String(Boolean(plan.isFeatured)),
        features: Array.isArray(plan.features) ? plan.features.join(",") : "",
      },
    });
    productId = product.id;
  }

  const priceIdMonthly = await ensureRecurringPrice({
    productId,
    existingPriceId: plan.stripePriceIdMonthly,
    unitAmount: Math.round(Number(plan.price.monthly || 0) * 100),
    interval: "month",
    planId: plan.id,
  });
  const priceIdAnnually = await ensureRecurringPrice({
    productId,
    existingPriceId: plan.stripePriceIdAnnually,
    unitAmount: Math.round(Number(plan.price.annually || 0) * 100),
    interval: "year",
    planId: plan.id,
  });

  return {
    success: true,
    productId,
    priceIdMonthly,
    priceIdAnnually,
  };
}

async function ensureRecurringPrice(params: {
  productId: string;
  existingPriceId?: string;
  unitAmount: number;
  interval: "month" | "year";
  planId: string;
}) {
  if (params.unitAmount <= 0) return undefined;

  if (params.existingPriceId) {
    const existing = await stripe.prices.retrieve(params.existingPriceId);
    if (
      existing.active &&
      existing.unit_amount === params.unitAmount &&
      existing.currency === "usd" &&
      existing.recurring?.interval === params.interval
    ) {
      return existing.id;
    }
    await stripe.prices.update(existing.id, { active: false });
  }

  const prices = await stripe.prices.list({
    product: params.productId,
    active: true,
    limit: 100,
  });
  const matching = prices.data.find((price) =>
    price.unit_amount === params.unitAmount &&
    price.currency === "usd" &&
    price.recurring?.interval === params.interval
  );
  if (matching) return matching.id;

  const price = await stripe.prices.create({
    product: params.productId,
    unit_amount: params.unitAmount,
    currency: "usd",
    recurring: { interval: params.interval },
    metadata: { planId: params.planId },
  });

  return price.id;
}

async function archivePlan(userId: string, data: any) {
  await requirePlatformAdmin(userId);
  const { productId } = data;
  if (!productId) throw new Error("productId is required");

  await stripe.products.update(productId, { active: false });
  return { success: true };
}

async function createSubscriptionCheckout(user: any, data: any) {
  const {
    planId,
    billingCycle = "monthly",
    tenantId,
    successUrl,
    cancelUrl,
    metadata = {},
  } = data;

  if (!planId) throw new Error("planId is required");
  const membership = await requireTenantAccess(user.id, tenantId);
  const tenant = membership.tenant;
  const localSub = await getLocalSubscription(tenant.id);
  const priceId = await resolvePriceId(planId, billingCycle);
  const customer = await getOrCreateCustomer(user, tenant, localSub);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer: customer.id,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { ...metadata, userId: user.id, tenantId: tenant.id, planId, billingCycle },
    },
    metadata: { ...metadata, userId: user.id, tenantId: tenant.id, planId, billingCycle },
  });

  await supabase
    .from("subscriptions")
    .upsert({
      tenant_id: tenant.id,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: "incomplete",
      stripe_customer_id: customer.id,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

  return { id: session.id, url: session.url, success: true };
}

async function createBillingPortalSession(userId: string, data: any) {
  const { tenantId, returnUrl } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const localSub = await getLocalSubscription(membership.tenant_id);

  if (!localSub?.stripe_customer_id) {
    throw new Error("No Stripe customer is linked to this workspace");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: localSub.stripe_customer_id,
    return_url: returnUrl || `${Deno.env.get("PUBLIC_URL") || "http://localhost:8080"}/settings/subscription`,
  });

  return { url: session.url };
}

async function getSubscriptionDetails(userId: string, data: any) {
  const { tenantId } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const localSub = await getLocalSubscription(membership.tenant_id);

  if (!localSub) {
    return { subscription: null };
  }

  let stripeSubscription: Stripe.Subscription | null = null;
  if (localSub.stripe_subscription_id) {
    stripeSubscription = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id, {
      expand: ["latest_invoice.payment_intent", "items.data.price.product"],
    });
    await syncLocalSubscriptionFromStripe(membership.tenant_id, stripeSubscription);
  }

  const latestInvoice = stripeSubscription?.latest_invoice as Stripe.Invoice | undefined;
  const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | undefined;
  const paymentError = paymentIntent?.last_payment_error;

  return {
    subscription: {
      local: localSub,
      stripe: stripeSubscription
        ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodStart: isoFromStripe(stripeSubscription.current_period_start),
          currentPeriodEnd: isoFromStripe(stripeSubscription.current_period_end),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          cancelAt: isoFromStripe(stripeSubscription.cancel_at),
          customerId: stripeSubscription.customer,
          latestInvoiceUrl: latestInvoice?.hosted_invoice_url || null,
          latestInvoiceStatus: latestInvoice?.status || null,
          amountDue: latestInvoice?.amount_due ?? null,
          currency: latestInvoice?.currency || "usd",
          paymentIssue: paymentError
            ? {
              code: paymentError.code,
              declineCode: paymentError.decline_code,
              message: paymentError.message,
            }
            : null,
        }
        : null,
    },
  };
}

async function syncStripeSubscriptions(userId: string | undefined, isServiceRoleRequest: boolean, data: any) {
  if (!isServiceRoleRequest) {
    if (!userId) throw new Error("Invalid or missing user token");
    await requirePlatformAdmin(userId);
  }

  const targets = await resolveStripeSyncTargets(data);
  if (targets.length === 0) {
    throw new Error("No local Stripe subscriptions matched the sync request");
  }

  const results = [];
  for (const target of targets) {
    const stripeSubscription = await stripe.subscriptions.retrieve(target.stripe_subscription_id, {
      expand: ["items.data.price.product"],
    });
    const tenantId = target.tenant_id || await resolveTenantIdFromStripeSubscription(stripeSubscription);
    if (!tenantId) {
      results.push({
        stripeSubscriptionId: target.stripe_subscription_id,
        success: false,
        error: "Could not resolve tenant for Stripe subscription",
      });
      continue;
    }

    const before = await getLocalSubscription(tenantId);
    await syncLocalSubscriptionFromStripe(tenantId, stripeSubscription);
    const after = await getLocalSubscription(tenantId);

    results.push({
      tenantId,
      stripeSubscriptionId: stripeSubscription.id,
      success: true,
      before: summarizeSubscriptionForSync(before),
      after: summarizeSubscriptionForSync(after),
    });
  }

  return {
    success: true,
    count: results.length,
    results,
  };
}

async function resolveStripeSyncTargets(data: any): Promise<Array<{ tenant_id: string | null; stripe_subscription_id: string }>> {
  if (data.subscriptionId) {
    const { data: local } = await supabase
      .from("subscriptions")
      .select("tenant_id, stripe_subscription_id")
      .eq("stripe_subscription_id", data.subscriptionId)
      .maybeSingle();

    return [{
      tenant_id: local?.tenant_id || null,
      stripe_subscription_id: data.subscriptionId,
    }];
  }

  let query = supabase
    .from("subscriptions")
    .select("tenant_id, stripe_subscription_id, status")
    .not("stripe_subscription_id", "is", null);

  if (data.tenantId) {
    query = query.eq("tenant_id", data.tenantId);
  } else if (data.email) {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (!user?.id) return [];

    const { data: memberships, error } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id);
    if (error) throw error;

    const tenantIds = (memberships || []).map((membership: any) => membership.tenant_id).filter(Boolean);
    if (tenantIds.length === 0) return [];
    query = query.in("tenant_id", tenantIds);
  } else if (data.allActive) {
    query = query.in("status", ["active", "trial", "trialing", "past_due", "incomplete"]);
  } else {
    throw new Error("Provide email, tenantId, subscriptionId, or allActive=true");
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  return (rows || [])
    .filter((row: any) => row.stripe_subscription_id)
    .map((row: any) => ({
      tenant_id: row.tenant_id,
      stripe_subscription_id: row.stripe_subscription_id,
    }));
}

async function resolveTenantIdFromStripeSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const metadataTenantId = subscription.metadata?.tenantId;
  if (metadataTenantId && await tenantExists(metadataTenantId)) return metadataTenantId;

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
  return byCustomer?.tenant_id || null;
}

async function tenantExists(tenantId: string): Promise<boolean> {
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  return Boolean(data?.id);
}

function summarizeSubscriptionForSync(subscription: any) {
  const usage = subscription?.ai_credits_usage || {};
  return subscription
    ? {
      planId: subscription.plan_id,
      status: subscription.status,
      billingCycle: subscription.billing_cycle,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      creditsIncluded: usage.creditsIncluded,
      creditsUsed: usage.creditsUsed,
      creditsRemaining: usage.creditsRemaining,
      planCreditsIncluded: usage.planCreditsIncluded,
      usagePlanId: usage.planId,
      lastUpdated: usage.lastUpdated,
    }
    : null;
}

async function updateSubscription(userId: string, data: any) {
  const { tenantId, newPlanId, billingCycle = "monthly" } = data;
  if (!newPlanId) throw new Error("newPlanId is required");

  const membership = await requireTenantAccess(userId, tenantId);
  const localSub = await getLocalSubscription(membership.tenant_id);
  if (!localSub?.stripe_subscription_id) {
    throw new Error("No active Stripe subscription");
  }

  const subscription = await stripe.subscriptions.retrieve(localSub.stripe_subscription_id);
  if (!["active", "trialing", "past_due"].includes(subscription.status)) {
    throw new Error("No active Stripe subscription");
  }

  const priceId = await resolvePriceId(newPlanId, billingCycle);
  const item = subscription.items.data[0];
  if (!item) throw new Error("Subscription has no billable items");

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: "create_prorations",
    metadata: { ...subscription.metadata, tenantId: membership.tenant_id, planId: newPlanId, billingCycle },
  });

  await syncLocalSubscriptionFromStripe(membership.tenant_id, updated);
  return { success: true, subscriptionId: updated.id };
}

async function cancelSubscription(userId: string, data: any) {
  const { tenantId, immediately = false } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const localSub = await getLocalSubscription(membership.tenant_id);
  if (!localSub?.stripe_subscription_id) throw new Error("No Stripe subscription is linked to this workspace");

  const updated = immediately
    ? await stripe.subscriptions.cancel(localSub.stripe_subscription_id)
    : await stripe.subscriptions.update(localSub.stripe_subscription_id, { cancel_at_period_end: true });

  await syncLocalSubscriptionFromStripe(membership.tenant_id, updated);
  return {
    success: true,
    message: immediately
      ? "Suscripción cancelada."
      : "Suscripción programada para cancelarse al final del período.",
  };
}

async function reactivateSubscription(userId: string, data: any) {
  const { tenantId } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const localSub = await getLocalSubscription(membership.tenant_id);
  if (!localSub?.stripe_subscription_id) throw new Error("No Stripe subscription is linked to this workspace");

  const updated = await stripe.subscriptions.update(localSub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await syncLocalSubscriptionFromStripe(membership.tenant_id, updated);
  return { success: true, message: "Suscripción reactivada." };
}

async function syncLocalSubscriptionFromStripe(tenantId: string, subscription: Stripe.Subscription) {
  const inferredPlanId = await inferPlanId(subscription);
  const planId = inferredPlanId || subscription.metadata?.planId || "free";
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === "year" ? "annually" : "monthly";
  const existing = await getLocalSubscription(tenantId);
  const usage = await normalizedCreditsUsage(tenantId, planId, existing?.ai_credits_usage, {
    previousPlanId: existing?.plan_id,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    resetPeriod: shouldResetCreditsForPeriod(existing, subscription),
  });

  const row = {
    tenant_id: tenantId,
    plan_id: planId,
    billing_cycle: billingCycle,
    status: subscription.status === "trialing" ? "trial" : subscription.status,
    start_date: isoFromStripe(subscription.start_date),
    current_period_start: isoFromStripe(subscription.current_period_start),
    current_period_end: isoFromStripe(subscription.current_period_end) || new Date().toISOString(),
    trial_end_date: isoFromStripe(subscription.trial_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancelled_at: isoFromStripe(subscription.canceled_at),
    stripe_customer_id: String(subscription.customer),
    stripe_subscription_id: subscription.id,
    ai_credits_usage: usage,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("subscriptions").upsert(row, { onConflict: "tenant_id" });
  await supabase
    .from("tenants")
    .update({
      subscription_plan: planId,
      billing: {
        stripeCustomerId: String(subscription.customer),
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        subscriptionStatus: row.status,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);
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
    console.warn(`[stripe-api] could not verify plan ${planId}:`, error.message);
  }

  return Boolean(data?.id || FALLBACK_PLAN_CREDIT_LIMITS[planId] !== undefined);
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

  const plan = await getPlan(planId).catch((error) => {
    console.warn(`[stripe-api] could not load credit limit for plan ${planId}:`, error.message);
    return null;
  });
  const fromDb = Number(plan?.limits?.maxAiCredits);
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
    console.warn(`[stripe-api] could not load tenant plan for ${tenantId}:`, error.message);
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

async function createCreditPackageCheckout(userId: string, data: any) {
  const { packageId, tenantId, successUrl, cancelUrl } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) throw new Error("Invalid credit package");

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const localSub = await getLocalSubscription(membership.tenant_id);
  const customer = await getOrCreateCustomer(authUser.user || { id: userId }, membership.tenant, localSub);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: pkg.name,
          description: `${pkg.credits.toLocaleString()} AI credits for Quimera AI`,
        },
        unit_amount: cents(pkg.price),
      },
      quantity: 1,
    }],
    success_url: successUrl || `${getBaseUrl()}/dashboard?credits=success`,
    cancel_url: cancelUrl || `${getBaseUrl()}/dashboard?credits=cancelled`,
    metadata: {
      type: "ai_credits",
      packageId,
      credits: String(pkg.credits),
      tenantId: membership.tenant_id,
      userId,
    },
  });

  return { id: session.id, url: session.url, credits: pkg.credits };
}

async function getStripeConnectStatus(userId: string, data: any) {
  const { tenantId } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const accountId = membership.tenant?.billing?.stripeConnectAccountId;
  if (!accountId) return { isConnected: false };

  const account = await stripe.accounts.retrieve(accountId);
  return {
    isConnected: account.details_submitted,
    accountId: account.id,
    detailsSubmitted: account.details_submitted,
  };
}

async function createStripeConnectAccount(userId: string, data: any) {
  const { tenantId } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const tenant = membership.tenant;
  let accountId = tenant?.billing?.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { tenantId: tenant.id, userId },
    });
    accountId = account.id;
    await supabase
      .from("tenants")
      .update({ billing: { ...(tenant.billing || {}), stripeConnectAccountId: accountId } })
      .eq("id", tenant.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${Deno.env.get("PUBLIC_URL") || "http://localhost:8080"}/dashboard/billing`,
    return_url: `${Deno.env.get("PUBLIC_URL") || "http://localhost:8080"}/dashboard/billing`,
    type: "account_onboarding",
  });

  return { url: accountLink.url };
}

async function updateClientMonthlyPrice(userId: string, data: any) {
  const clientId = data.clientId || data.clientTenantId;
  const price = data.price ?? data.newMonthlyPrice;
  if (!clientId) throw new Error("clientId is required");
  await requireTenantAccess(userId, clientId);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("billing")
    .eq("id", clientId)
    .maybeSingle();
  if (tenantError) throw tenantError;

  const { error } = await supabase
    .from("tenants")
    .update({ billing: { ...(tenant?.billing || {}), monthlyPrice: price } })
    .eq("id", clientId);

  if (error) throw error;
  return { success: true };
}

async function updateSubscriptionAddons(userId: string, data: any) {
  const { tenantId, addons } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const billing = membership.tenant?.billing || {};

  const { error } = await supabase
    .from("tenants")
    .update({ billing: { ...billing, addons } })
    .eq("id", membership.tenant_id);

  if (error) throw error;
  return { success: true, newMonthlyTotal: 0 };
}

function getAddonsPricing() {
  return {
    pricing: {
      extraSubClients: 15,
      extraStorageGB: 10,
      extraAiCredits: 20,
    },
  };
}

function nowIso() {
  return new Date().toISOString();
}

function getBaseUrl() {
  return Deno.env.get("PUBLIC_URL") || "http://localhost:8080";
}

function cents(amount: number) {
  return Math.round(Number(amount || 0) * 100);
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? "null" : encoded;
}

function randomToken(prefix = "") {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${prefix}${token}`;
}

async function getStoreContext(storeId: string) {
  if (!storeId) throw new Error("storeId is required");

  const { data: publicStore } = await supabase
    .from("public_stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();

  const publicData = publicStore?.data || {};
  const projectId = publicData.projectId || publicData.project_id || publicStore?.project_id || storeId;
  const ownerId = publicStore?.user_id || publicData.userId || publicData.user_id || null;

  const { data: settingsRow, error: settingsError } = await supabase
    .from("store_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (settingsError) throw settingsError;
  if (!settingsRow) throw new Error("Store settings not found");

  const settings = {
    ...(settingsRow.data || {}),
    ...settingsRow,
    stripeConnectAccountId: settingsRow.stripe_connect_account_id || settingsRow.data?.stripeConnectAccountId,
    stripeConnectChargesEnabled: settingsRow.stripe_connect_charges_enabled ?? settingsRow.data?.stripeConnectChargesEnabled,
    stripeConnectPayoutsEnabled: settingsRow.stripe_connect_payouts_enabled ?? settingsRow.data?.stripeConnectPayoutsEnabled,
    stripeConnectDetailsSubmitted: settingsRow.stripe_connect_details_submitted ?? settingsRow.data?.stripeConnectDetailsSubmitted,
    stripeConnectStatus: settingsRow.stripe_connect_status || settingsRow.data?.stripeConnectStatus,
    stripeEnabled: settingsRow.stripe_enabled ?? settingsRow.data?.stripeEnabled,
    currency: settingsRow.currency || settingsRow.data?.currency || "USD",
    shippingZones: settingsRow.shipping_zones || settingsRow.data?.shippingZones || [],
    freeShippingThreshold: Number(settingsRow.free_shipping_threshold ?? settingsRow.data?.freeShippingThreshold ?? 0),
    taxEnabled: settingsRow.tax_enabled ?? settingsRow.data?.taxEnabled,
    taxRate: Number(settingsRow.tax_rate ?? settingsRow.data?.taxRate ?? 0),
    taxName: settingsRow.tax_name || settingsRow.data?.taxName || "Tax",
    taxIncluded: settingsRow.tax_included ?? settingsRow.data?.taxIncluded ?? settingsRow.data?.taxIncludedInPrice ?? false,
    storeName: settingsRow.store_name || settingsRow.data?.storeName || "Store",
  };

  return { storeId, projectId, ownerId, settingsRow, settings, publicStore };
}

function getOrderData(row: any) {
  return row?.data || row || {};
}

function getOrderPaymentIntentId(row: any): string | null {
  const data = getOrderData(row);
  return row?.stripe_payment_intent_id || row?.payment_intent_id || data?.stripe?.paymentIntentId || null;
}

function isReusablePaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  return !["canceled"].includes(paymentIntent.status);
}

async function getExistingCheckoutOrder(checkoutIdempotencyKey: string) {
  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .eq("checkout_idempotency_key", checkoutIdempotencyKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function formatStoredCheckoutResponse(row: any, paymentIntent?: Stripe.PaymentIntent | null) {
  const data = getOrderData(row);
  const stripeData = data.stripe || {};
  return {
    clientSecret: paymentIntent?.client_secret || stripeData.clientSecret,
    paymentIntentId: paymentIntent?.id || row.stripe_payment_intent_id || row.payment_intent_id || stripeData.paymentIntentId,
    orderId: row.id,
    orderNumber: row.order_number || data.orderNumber,
    orderAccessToken: data.orderAccessToken,
    total: Number(row.total_amount ?? row.total ?? data.total ?? 0),
    cartHash: row.cart_hash || data.cartHash,
    checkoutIdempotencyKey: row.checkout_idempotency_key || data.checkoutIdempotencyKey,
    reused: true,
  };
}

async function findReusableStorePaymentIntent(row: any) {
  const paymentIntentId = getOrderPaymentIntentId(row);
  if (!paymentIntentId) return null;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return isReusablePaymentIntent(paymentIntent) ? paymentIntent : null;
  } catch (error: any) {
    console.warn("[stripe-api] could not retrieve existing PaymentIntent:", paymentIntentId, error.message);
    return null;
  }
}

async function requireStoreOwner(userId: string, storeId: string) {
  const context = await getStoreContext(storeId);
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id, tenant_id")
    .eq("id", context.projectId)
    .maybeSingle();
  if (error) throw error;

  if (project?.user_id === userId || context.ownerId === userId) return context;

  if (project?.tenant_id) {
    await requireTenantAccess(userId, project.tenant_id);
    return context;
  }

  throw new Error("No tienes acceso a esta tienda");
}

function normalizeProduct(row: any) {
  const data = row?.data || {};
  return {
    id: row.id,
    projectId: row.project_id || data.projectId || null,
    storeId: row.store_id || data.storeId || null,
    publicStoreId: row.public_store_id || data.publicStoreId || null,
    name: row.name || data.name,
    status: row.status || data.status,
    price: Number(row.price ?? data.price ?? 0),
    currency: row.currency || data.currency || null,
    quantity: Number(row.quantity ?? row.inventory_quantity ?? data.quantity ?? data.inventoryQuantity ?? data.inventory_quantity ?? 0),
    trackInventory: row.track_inventory ?? data.trackInventory ?? data.track_inventory ?? true,
    lowStockThreshold: Number(row.low_stock_threshold ?? data.lowStockThreshold ?? data.low_stock_threshold ?? 5),
    hasVariants: row.has_variants ?? data.hasVariants ?? false,
    variants: row.variants || data.variants || [],
    images: row.images || data.images || [],
    categoryId: row.category_id || data.categoryId || data.category_id || data.category || null,
    isDigital: row.is_digital ?? data.isDigital ?? data.is_digital ?? false,
  };
}

async function getStoreProduct(projectId: string, productId: string) {
  const { data, error } = await supabase
    .from("store_products")
    .select("*")
    .eq("id", productId)
    .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Product ${productId} not found`);
  return normalizeProduct(data);
}

function roundMoney(amount: unknown) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

function readJsonData(row: any) {
  return row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : {};
}

function readRuntimeField(row: any, snakeKey: string, camelKey = snakeKey) {
  const data = readJsonData(row);
  return row?.[snakeKey] ?? data?.[camelKey] ?? data?.[snakeKey];
}

function normalizeDiscountCode(code: unknown) {
  return String(code || "").trim().toUpperCase();
}

async function loadStoreDiscountCandidates(projectId: string, code?: string | null, customerEmail?: string | null) {
  const normalizedCode = normalizeDiscountCode(code);
  const { data, error } = await supabase
    .from("store_discounts")
    .select("*")
    .eq("project_id", projectId)
    .limit(100);

  if (error) throw error;

  const candidates = (data || []).filter((discount: any) => {
    const discountCode = normalizeDiscountCode(readRuntimeField(discount, "code", "code"));
    const isAutomatic = readRuntimeField(discount, "is_automatic", "isAutomatic") === true;
    return (normalizedCode && discountCode === normalizedCode) || isAutomatic;
  });

  const normalizedEmail = String(customerEmail || "").trim().toLowerCase();
  if (!normalizedEmail) return candidates;

  const enriched = [];
  for (const discount of candidates) {
    const maxUsesPerCustomer = Number(readRuntimeField(discount, "max_uses_per_customer", "maxUsesPerCustomer") || 0);
    const discountCode = normalizeDiscountCode(readRuntimeField(discount, "code", "code"));
    if (maxUsesPerCustomer <= 0 || !discountCode) {
      enriched.push(discount);
      continue;
    }

    const { count, error: usageError } = await supabase
      .from("store_orders")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("customer_email", normalizedEmail)
      .eq("discount_code", discountCode)
      .eq("payment_status", "paid");
    if (usageError) throw usageError;
    enriched.push({
      ...discount,
      customer_usage_count: Number(count || 0),
      data: {
        ...(discount.data || {}),
        customerUsageCount: Number(count || 0),
      },
    });
  }

  return enriched;
}

async function calculateCheckoutPricing(args: {
  canonicalItems: any[];
  customerEmail?: string | null;
  discountCode?: string | null;
  projectId: string;
  settings: any;
  shippingAddress?: any;
  shippingMethodId?: string | null;
  subtotal: number;
}) {
  const discounts = await loadStoreDiscountCandidates(args.projectId, args.discountCode, args.customerEmail);
  const result = calculateServerCheckoutTotals({
    currency: args.settings.currency || "USD",
    canonicalItems: args.canonicalItems,
    discounts,
    discountCode: args.discountCode,
    settings: args.settings,
    shippingAddress: args.shippingAddress,
    shippingMethodId: args.shippingMethodId,
    customerEmail: args.customerEmail,
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0]);
  }

  const primaryDiscount = result.appliedDiscounts[0] || null;
  const snapshot = result.snapshot;

  return {
    subtotal: result.subtotal,
    discount: primaryDiscount,
    appliedDiscounts: result.appliedDiscounts,
    discountCode: primaryDiscount?.code || null,
    discountAmount: result.discountAmount,
    discountTotal: result.discountAmount,
    shippingTotal: result.shippingAmount,
    shippingMethodId: result.shippingMethod?.id || null,
    shippingMethodName: result.shippingMethod?.name || "Standard",
    taxTotal: result.taxAmount,
    taxName: result.taxBreakdown[0]?.name || args.settings.taxName || "Tax",
    taxRate: Number(result.taxBreakdown[0]?.rate ?? args.settings.taxRate ?? 0),
    taxIncluded: Boolean(result.taxBreakdown[0]?.included || args.settings.taxIncluded || args.settings.taxIncludedInPrice),
    taxBreakdown: result.taxBreakdown,
    total: result.total,
    warnings: result.warnings,
    snapshot,
    calculationVersion: snapshot.calculationVersion,
  };
}

async function buildStoreCanonicalItems(projectId: string, items: any[]) {
  const productIds = Array.from(new Set(
    (items || []).map((item: any) => String(item.productId || "").trim()).filter(Boolean),
  ));
  const products = [];

  for (const productId of productIds) {
    products.push(await getStoreProduct(projectId, productId));
  }

  const subtotalResult = calculateServerCartSubtotal({
    items: (items || []).map((item: any) => ({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: Number(item.quantity || 0),
    })),
    products,
  });

  if (subtotalResult.errors.length > 0) {
    throw new Error(subtotalResult.errors[0]);
  }

  return { subtotal: subtotalResult.subtotal, canonicalItems: subtotalResult.items };
}

async function buildStoreOrder(data: any, authUserId?: string | null) {
  const {
    storeId,
    items = [],
    customerEmail,
    customerName,
    customerPhone,
    shippingAddress,
    billingAddress,
    shippingMethodId,
    discountCode,
    idempotencyKey,
    sessionToken,
    notes,
  } = data;

  const context = await getStoreContext(storeId);
  const { projectId, ownerId, settings } = context;
  const currency = String(settings.currency || "USD").toLowerCase();
  const connectedAccountId = settings.stripeConnectAccountId;

  if (!settings.stripeEnabled || !connectedAccountId || !settings.stripeConnectChargesEnabled) {
    throw new Error("Store is not ready to accept payments");
  }

  const { subtotal, canonicalItems } = await buildStoreCanonicalItems(projectId, items);
  const pricing = await calculateCheckoutPricing({
    canonicalItems,
    customerEmail,
    discountCode,
    projectId,
    settings,
    shippingAddress,
    shippingMethodId,
    subtotal,
  });
  const cartHash = await sha256(stableStringify({
    currency,
    discountCode: pricing.discountCode,
    appliedDiscounts: pricing.appliedDiscounts,
    items: canonicalItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    shippingMethodId: pricing.shippingMethodId,
    shippingTotal: pricing.shippingTotal,
    subtotal: pricing.subtotal,
    taxTotal: pricing.taxTotal,
    total: pricing.total,
  }));
  const checkoutIdempotencyKey = `eco_${(await sha256(stableStringify({
    cartHash,
    clientIdempotencyKey: String(idempotencyKey || "").trim() || null,
    currency,
    customerEmail: String(customerEmail || "").trim().toLowerCase(),
    projectId,
    sessionToken: String(sessionToken || "").trim() || null,
    storeId: context.storeId,
    total: cents(pricing.total),
  }))).slice(0, 64)}`;
  const orderNumber = `ORD-${checkoutIdempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 32).toUpperCase()}`;
  const accessToken = randomToken("ord_");
  const accessTokenHash = await sha256(accessToken);

  return {
    context,
    projectId,
    ownerId,
    connectedAccountId,
    currency,
    orderNumber,
    checkoutIdempotencyKey,
    accessToken,
    accessTokenHash,
    cartHash,
    data: {
      orderNumber,
      customerEmail,
      customerName,
      customerPhone: customerPhone || null,
      items: canonicalItems,
      subtotal: pricing.subtotal,
      discount: pricing.discountAmount,
      discountAmount: pricing.discountAmount,
      discountCode: pricing.discountCode,
      discountRule: pricing.discount,
      shippingCost: pricing.shippingTotal,
      taxAmount: pricing.taxTotal,
      total: pricing.total,
      currency,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "stripe",
      shippingMethod: pricing.shippingMethodName,
      shippingMethodId: pricing.shippingMethodId,
      pricing: {
        ...pricing.snapshot,
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountAmount,
        shippingTotal: pricing.shippingTotal,
        taxTotal: pricing.taxTotal,
        total: pricing.total,
        discount: pricing.discount,
        discountCode: pricing.discountCode,
        appliedDiscounts: pricing.appliedDiscounts,
        shippingMethodId: pricing.shippingMethodId,
        shippingMethodName: pricing.shippingMethodName,
        taxName: pricing.taxName,
        taxRate: pricing.taxRate,
        taxIncluded: pricing.taxIncluded,
        taxBreakdown: pricing.taxBreakdown,
        warnings: pricing.warnings || [],
        calculationVersion: pricing.calculationVersion,
      },
      pricingSnapshot: pricing.snapshot,
      notes: notes || null,
      authUserId: authUserId || null,
      checkoutIdempotencyKey,
      orderAccessToken: accessToken,
      orderAccessTokenHash: accessTokenHash,
      cartHash,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  };
}

function splitCustomerName(name: unknown) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

function normalizeCustomerAddress(address: any, fallbackName?: unknown) {
  const fallback = splitCustomerName(fallbackName);
  return {
    firstName: address?.firstName || fallback.firstName,
    lastName: address?.lastName || fallback.lastName,
    company: address?.company || undefined,
    address1: address?.address1 || "",
    address2: address?.address2 || undefined,
    city: address?.city || "",
    state: address?.state || "",
    zipCode: address?.zipCode || "",
    country: address?.country || "",
    phone: address?.phone || undefined,
  };
}

function mergeCustomerAddresses(currentAddresses: any[], nextAddress: any) {
  const normalizedNext = normalizeCustomerAddress(nextAddress);
  if (!normalizedNext.address1) return currentAddresses;
  const exists = currentAddresses.some((address) =>
    String(address?.address1 || "").trim().toLowerCase() === normalizedNext.address1.trim().toLowerCase() &&
    String(address?.zipCode || "").trim().toLowerCase() === normalizedNext.zipCode.trim().toLowerCase()
  );
  return exists ? currentAddresses : [...currentAddresses, normalizedNext];
}

async function findOrCreateStoreCustomerForOrder(order: any, authUserId?: string | null) {
  const orderData = order.data || {};
  const email = String(orderData.customerEmail || "").trim().toLowerCase();
  if (!email) return null;

  const nameParts = splitCustomerName(orderData.customerName);
  const shippingAddress = normalizeCustomerAddress(orderData.shippingAddress, orderData.customerName);

  const { data: existingCustomer, error: customerError } = await supabase
    .from("store_customers")
    .select("*")
    .eq("project_id", order.projectId)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (customerError) throw customerError;

  if (existingCustomer) {
    const data = existingCustomer.data || {};
    const addresses = mergeCustomerAddresses(existingCustomer.addresses || data.addresses || [], shippingAddress);
    const { data: updatedCustomer, error } = await supabase
      .from("store_customers")
      .update({
        user_id: authUserId || existingCustomer.user_id || null,
        store_id: order.context.storeId,
        public_store_id: order.context.storeId,
        first_name: existingCustomer.first_name || nameParts.firstName || shippingAddress.firstName || "Customer",
        last_name: existingCustomer.last_name || nameParts.lastName || shippingAddress.lastName || "",
        phone: existingCustomer.phone || orderData.customerPhone || shippingAddress.phone || null,
        addresses,
        default_shipping_address: existingCustomer.default_shipping_address || shippingAddress,
        default_billing_address: existingCustomer.default_billing_address || orderData.billingAddress || shippingAddress,
        data: {
          ...data,
          userId: authUserId || existingCustomer.user_id || data.userId || null,
          storeId: order.context.storeId,
          publicStoreId: order.context.storeId,
          addresses,
          defaultShippingAddress: existingCustomer.default_shipping_address || data.defaultShippingAddress || shippingAddress,
          defaultBillingAddress: existingCustomer.default_billing_address || data.defaultBillingAddress || orderData.billingAddress || shippingAddress,
          updatedAt: nowIso(),
        },
        updated_at: nowIso(),
      })
      .eq("id", existingCustomer.id)
      .select("*")
      .single();
    if (error) throw error;
    return updatedCustomer || existingCustomer;
  }

  const { data: customer, error } = await supabase
    .from("store_customers")
    .insert({
      project_id: order.projectId,
      store_id: order.context.storeId,
      public_store_id: order.context.storeId,
      user_id: authUserId || null,
      email,
      first_name: nameParts.firstName || shippingAddress.firstName || "Customer",
      last_name: nameParts.lastName || shippingAddress.lastName || "",
      phone: orderData.customerPhone || shippingAddress.phone || null,
      total_orders: 0,
      total_spent: 0,
      addresses: shippingAddress.address1 ? [shippingAddress] : [],
      default_shipping_address: shippingAddress.address1 ? shippingAddress : null,
      default_billing_address: orderData.billingAddress || shippingAddress || null,
      accepts_marketing: Boolean(orderData.acceptsMarketing),
      data: {
        userId: authUserId || null,
        storeId: order.context.storeId,
        publicStoreId: order.context.storeId,
        addresses: shippingAddress.address1 ? [shippingAddress] : [],
        defaultShippingAddress: shippingAddress.address1 ? shippingAddress : null,
        defaultBillingAddress: orderData.billingAddress || shippingAddress || null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    })
    .select("*")
    .single();
  if (error) throw error;
  return customer;
}

async function validateStoreDiscount(data: any) {
  const {
    storeId,
    items = [],
    discountCode,
    customerEmail,
    shippingAddress,
    shippingMethodId,
  } = data;

  const context = await getStoreContext(storeId);
  const { subtotal, canonicalItems } = await buildStoreCanonicalItems(context.projectId, items);
  const pricing = await calculateCheckoutPricing({
    canonicalItems,
    customerEmail,
    discountCode,
    projectId: context.projectId,
    settings: context.settings,
    shippingAddress,
    shippingMethodId,
    subtotal,
  });

  if (!pricing.discount) throw new Error("Codigo de descuento invalido");

  return {
    valid: true,
    discountCode: pricing.discountCode,
    discountAmount: pricing.discountAmount,
    discountType: pricing.discount.type,
    discountScope: pricing.discount.scope,
    subtotal: pricing.subtotal,
    shippingTotal: pricing.shippingTotal,
    shippingMethodId: pricing.shippingMethodId,
    shippingMethodName: pricing.shippingMethodName,
    taxTotal: pricing.taxTotal,
    total: pricing.total,
    pricing,
  };
}

const INVENTORY_RESERVATION_TTL_MINUTES = 15;

function getInventoryReservationIds(reservations: any[]) {
  return reservations.map((reservation) => reservation?.id).filter(Boolean);
}

function getInventoryReservationMetadataValue(reservations: any[]) {
  return getInventoryReservationIds(reservations).slice(0, 8).join(",");
}

async function reserveInventoryForStoreOrder(
  order: any,
  refs: { orderId?: string | null; paymentIntentId?: string | null } = {},
) {
  const expiresAt = new Date(Date.now() + INVENTORY_RESERVATION_TTL_MINUTES * 60_000).toISOString();
  const reservations: any[] = [];

  for (const item of order.data.items || []) {
    if (item.trackInventory === false) continue;

    const productId = String(item.productId || "").trim();
    const quantity = Number(item.quantity || 0);
    if (!productId || quantity <= 0) continue;

    const variantId = item.variantId ? String(item.variantId) : "";
    const reservationKey = `inventory:reserve:${order.checkoutIdempotencyKey}:${productId}:${variantId || "default"}`;
    const { data, error } = await supabase.rpc("reserve_store_inventory_line", {
      p_project_id: order.projectId,
      p_store_id: order.context.storeId,
      p_public_store_id: order.context.storeId,
      p_order_id: refs.orderId || null,
      p_checkout_idempotency_key: order.checkoutIdempotencyKey,
      p_payment_intent_id: refs.paymentIntentId || null,
      p_product_id: productId,
      p_variant_id: variantId || null,
      p_quantity: quantity,
      p_expires_at: expiresAt,
      p_idempotency_key: reservationKey,
      p_metadata: {
        cartHash: order.cartHash,
        orderNumber: order.orderNumber,
        productName: item.productName || item.name || "",
        variantName: item.variantName || "",
      },
    });

    if (error) {
      throw new Error(error.message || `Insufficient stock for ${item.productName || item.name || productId}`);
    }
    if (data) reservations.push(data);
  }

  return { reservations, expiresAt };
}

async function linkInventoryReservationsToCheckout(args: {
  checkoutIdempotencyKey: string;
  orderId?: string | null;
  paymentIntentId?: string | null;
}) {
  const updates: Record<string, unknown> = { updated_at: nowIso() };
  if (args.orderId !== undefined) updates.order_id = args.orderId;
  if (args.paymentIntentId !== undefined) updates.payment_intent_id = args.paymentIntentId;

  const { error } = await supabase
    .from("store_inventory_reservations")
    .update(updates)
    .eq("checkout_idempotency_key", args.checkoutIdempotencyKey)
    .eq("status", "active");

  if (error) throw error;
}

async function persistOrderInventoryReferences(orderId: string, orderData: any, reservations: any[], expiresAt?: string | null) {
  const reservationIds = getInventoryReservationIds(reservations);
  if (reservationIds.length === 0) return;

  const { error } = await supabase
    .from("store_orders")
    .update({
      data: {
        ...orderData,
        inventory: {
          ...(orderData.inventory || {}),
          reservationIds,
          reservedAt: orderData.inventory?.reservedAt || nowIso(),
          reservationExpiresAt: expiresAt || orderData.inventory?.reservationExpiresAt || null,
        },
        updatedAt: nowIso(),
      },
      updated_at: nowIso(),
    })
    .eq("id", orderId);

  if (error) throw error;
}

async function releaseInventoryReservationsForCheckout(checkoutIdempotencyKey: string, reason = "checkout_aborted") {
  const { data: reservations, error } = await supabase
    .from("store_inventory_reservations")
    .select("id")
    .eq("checkout_idempotency_key", checkoutIdempotencyKey)
    .eq("status", "active");
  if (error) throw error;

  for (const reservation of reservations || []) {
    const { error: releaseError } = await supabase.rpc("release_store_inventory_reservation", {
      p_reservation_id: reservation.id,
      p_status: "released",
      p_reason: reason,
      p_released_at: nowIso(),
    });
    if (releaseError) throw releaseError;
  }
}

async function createStoreCheckoutIntent(data: any, authUserId?: string | null) {
  const order: any = await buildStoreOrder(data, authUserId);

  const existing = await getExistingCheckoutOrder(order.checkoutIdempotencyKey);

  if (existing) {
    const existingData = getOrderData(existing);
    const existingCartHash = existing.cart_hash || existingData.cartHash;
    if (existingCartHash && existingCartHash !== order.cartHash) {
      throw new Error("Checkout already exists for a different cart. Refresh checkout and try again.");
    }

    const reusablePaymentIntent = await findReusableStorePaymentIntent(existing);
    if (reusablePaymentIntent) {
      if (existing.payment_status !== "paid" && existingData.paymentStatus !== "paid") {
        const inventory = await reserveInventoryForStoreOrder(order, {
          orderId: existing.id,
          paymentIntentId: reusablePaymentIntent.id,
        });
        await linkInventoryReservationsToCheckout({
          checkoutIdempotencyKey: order.checkoutIdempotencyKey,
          orderId: existing.id,
          paymentIntentId: reusablePaymentIntent.id,
        });
        await persistOrderInventoryReferences(existing.id, existingData, inventory.reservations, inventory.expiresAt);
      }
      return formatStoredCheckoutResponse(existing, reusablePaymentIntent);
    }

    return await replaceStoreOrderPaymentIntent(existing, order);
  }

  const inventory = await reserveInventoryForStoreOrder(order);
  order.inventoryReservations = inventory.reservations;
  order.inventoryReservationIds = getInventoryReservationIds(inventory.reservations);

  let paymentIntent: Stripe.PaymentIntent;
  let platformFeeAmount: number;
  try {
    const createdPaymentIntent = await createStorePaymentIntent(order);
    paymentIntent = createdPaymentIntent.paymentIntent;
    platformFeeAmount = createdPaymentIntent.platformFeeAmount;
  } catch (error) {
    await releaseInventoryReservationsForCheckout(order.checkoutIdempotencyKey, "payment_intent_creation_failed").catch((releaseError) => {
      console.warn("[stripe-api] could not release inventory after payment intent failure:", releaseError.message);
    });
    throw error;
  }
  let customer: any = null;
  try {
    customer = await findOrCreateStoreCustomerForOrder(order, authUserId || null);
  } catch (error) {
    await releaseInventoryReservationsForCheckout(order.checkoutIdempotencyKey, "customer_resolution_failed").catch((releaseError) => {
      console.warn("[stripe-api] could not release inventory after customer failure:", releaseError.message);
    });
    throw error;
  }

  const orderData = {
    ...order.data,
    customerId: customer?.id || null,
    inventory: {
      ...(order.data.inventory || {}),
      reservationIds: order.inventoryReservationIds,
      reservedAt: nowIso(),
      reservationExpiresAt: inventory.expiresAt,
    },
    pricing: {
      ...(order.data.pricing || {}),
      platformFeeTotal: platformFeeAmount / 100,
    },
    stripe: {
      paymentIntentId: paymentIntent.id,
      connectedAccountId: order.connectedAccountId,
      clientSecret: paymentIntent.client_secret,
      applicationFeeAmount: platformFeeAmount,
      attempt: 1,
    },
  };

  const { data: inserted, error } = await supabase
    .from("store_orders")
    .insert({
      store_id: order.context.storeId,
      public_store_id: order.context.storeId,
      user_id: authUserId || null,
      project_id: order.projectId,
      order_number: order.orderNumber,
      customer_id: customer?.id || null,
      customer_email: orderData.customerEmail,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discount: orderData.discountAmount,
      discount_amount: orderData.discountAmount,
      discount_code: orderData.discountCode,
      shipping_cost: orderData.shippingCost,
      shipping_amount: orderData.shippingCost,
      tax_amount: orderData.taxAmount,
      total: orderData.total,
      total_amount: orderData.total,
      currency: orderData.currency.toUpperCase(),
      pricing: orderData.pricing,
      checkout_idempotency_key: order.checkoutIdempotencyKey,
      cart_hash: order.cartHash,
      stripe: orderData.stripe,
      shipping_address: orderData.shippingAddress,
      billing_address: orderData.billingAddress,
      status: "pending",
      payment_status: "pending",
      fulfillment_status: "unfulfilled",
      payment_method: "stripe",
      payment_intent_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      notes: orderData.notes,
      customer_notes: orderData.notes,
      shipping_method: orderData.shippingMethod,
      metadata: {
        source: "stripe-api",
        checkoutIdempotencyKey: order.checkoutIdempotencyKey,
        cartHash: order.cartHash,
        discountCode: orderData.discountCode,
      },
      data: orderData,
    })
    .select("*")
    .single();

  if (error) {
    const duplicateCheckout = error.code === "23505" || /duplicate|unique/i.test(error.message || "");
    if (duplicateCheckout) {
      const racedOrder = await getExistingCheckoutOrder(order.checkoutIdempotencyKey);
      if (racedOrder) {
        const reusablePaymentIntent = await findReusableStorePaymentIntent(racedOrder);
        if (reusablePaymentIntent) return formatStoredCheckoutResponse(racedOrder, reusablePaymentIntent);
        return await replaceStoreOrderPaymentIntent(racedOrder, order);
      }
    }
    await releaseInventoryReservationsForCheckout(order.checkoutIdempotencyKey, "order_insert_failed").catch((releaseError) => {
      console.warn("[stripe-api] could not release inventory after order insert failure:", releaseError.message);
    });
    throw error;
  }

  await linkInventoryReservationsToCheckout({
    checkoutIdempotencyKey: order.checkoutIdempotencyKey,
    orderId: inserted.id,
    paymentIntentId: paymentIntent.id,
  });

  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: {
      ...paymentIntent.metadata,
      orderId: inserted.id,
      inventoryReservationIds: getInventoryReservationMetadataValue(inventory.reservations),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    orderId: inserted.id,
    orderNumber: order.orderNumber,
    orderAccessToken: order.accessToken,
    total: orderData.total,
    cartHash: order.cartHash,
    checkoutIdempotencyKey: order.checkoutIdempotencyKey,
    reused: false,
  };
}

async function createStorePaymentIntent(order: any, idempotencySuffix = "") {
  const platformFeeAmount = Math.round(order.data.total * 0.01 * 100);
  const stripeIdempotencyKey = `pi_${order.checkoutIdempotencyKey}${idempotencySuffix}`.slice(0, 255);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: cents(order.data.total),
    currency: order.currency,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: platformFeeAmount > 0 ? platformFeeAmount : undefined,
    transfer_data: { destination: order.connectedAccountId },
    metadata: {
      storeId: order.context.storeId,
      projectId: order.projectId,
      ownerId: order.ownerId || "",
      orderNumber: order.orderNumber,
      checkoutIdempotencyKey: order.checkoutIdempotencyKey,
      cartHash: order.cartHash,
      discountCode: order.data.discountCode || "",
      inventoryReservationIds: getInventoryReservationMetadataValue(order.inventoryReservations || []),
    },
  }, { idempotencyKey: stripeIdempotencyKey });

  return { paymentIntent, platformFeeAmount };
}

async function replaceStoreOrderPaymentIntent(existing: any, order: any) {
  const existingData = getOrderData(existing);
  const existingStripe = existingData.stripe || {};
  const nextAttempt = Number(existingStripe.attempt || 1) + 1;
  const inventory = await reserveInventoryForStoreOrder(order, { orderId: existing.id });
  order.inventoryReservations = inventory.reservations;
  order.inventoryReservationIds = getInventoryReservationIds(inventory.reservations);

  let paymentIntent: Stripe.PaymentIntent;
  let platformFeeAmount: number;
  try {
    const createdPaymentIntent = await createStorePaymentIntent(order, `_retry_${nextAttempt}`);
    paymentIntent = createdPaymentIntent.paymentIntent;
    platformFeeAmount = createdPaymentIntent.platformFeeAmount;
  } catch (error) {
    await releaseInventoryReservationsForCheckout(order.checkoutIdempotencyKey, "payment_intent_retry_failed").catch((releaseError) => {
      console.warn("[stripe-api] could not release inventory after retry failure:", releaseError.message);
    });
    throw error;
  }
  let customer: any = null;
  try {
    customer = await findOrCreateStoreCustomerForOrder(order, order.data.authUserId || existing.user_id || null);
  } catch (error) {
    await releaseInventoryReservationsForCheckout(order.checkoutIdempotencyKey, "customer_resolution_retry_failed").catch((releaseError) => {
      console.warn("[stripe-api] could not release inventory after retry customer failure:", releaseError.message);
    });
    throw error;
  }
  const nextData = {
    ...order.data,
    customerId: customer?.id || existing.customer_id || existingData.customerId || null,
    status: "pending",
    paymentStatus: "pending",
    updatedAt: nowIso(),
    inventory: {
      ...(existingData.inventory || {}),
      ...(order.data.inventory || {}),
      reservationIds: order.inventoryReservationIds,
      reservedAt: existingData.inventory?.reservedAt || nowIso(),
      reservationExpiresAt: inventory.expiresAt,
    },
    pricing: {
      ...(order.data.pricing || {}),
      platformFeeTotal: platformFeeAmount / 100,
    },
    stripe: {
      ...existingStripe,
      paymentIntentId: paymentIntent.id,
      connectedAccountId: order.connectedAccountId,
      clientSecret: paymentIntent.client_secret,
      applicationFeeAmount: platformFeeAmount,
      attempt: nextAttempt,
    },
  };

  const { data: updated, error } = await supabase
    .from("store_orders")
    .update({
      status: "pending",
      payment_status: "pending",
      user_id: order.data.authUserId || existing.user_id || null,
      customer_id: customer?.id || existing.customer_id || null,
      payment_intent_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      subtotal: nextData.subtotal,
      discount: nextData.discountAmount,
      discount_amount: nextData.discountAmount,
      discount_code: nextData.discountCode,
      shipping_cost: nextData.shippingCost,
      shipping_amount: nextData.shippingCost,
      tax_amount: nextData.taxAmount,
      total: nextData.total,
      total_amount: nextData.total,
      pricing: nextData.pricing,
      stripe: nextData.stripe,
      metadata: {
        ...(existing.metadata || {}),
        checkoutIdempotencyKey: order.checkoutIdempotencyKey,
        cartHash: order.cartHash,
        discountCode: nextData.discountCode,
        paymentIntentReplacedAt: nowIso(),
      },
      data: nextData,
      updated_at: nowIso(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw error;

  await linkInventoryReservationsToCheckout({
    checkoutIdempotencyKey: order.checkoutIdempotencyKey,
    orderId: existing.id,
    paymentIntentId: paymentIntent.id,
  });

  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: {
      ...paymentIntent.metadata,
      orderId: existing.id,
      inventoryReservationIds: getInventoryReservationMetadataValue(inventory.reservations),
    },
  });

  return formatStoredCheckoutResponse(updated || existing, paymentIntent);
}

async function createStoreCheckoutSession(data: any) {
  const { storeId, items = [], successUrl, cancelUrl, customerEmail } = data;
  const context = await getStoreContext(storeId);
  const lineItems = [];
  for (const item of items) {
    const product = await getStoreProduct(context.projectId, item.productId);
    lineItems.push({
      price_data: {
        currency: String(context.settings.currency || "USD").toLowerCase(),
        product_data: { name: product.name },
        unit_amount: cents(product.price),
      },
      quantity: Number(item.quantity || 1),
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { storeId, projectId: context.projectId },
  });

  return { sessionId: session.id, id: session.id, url: session.url };
}

async function getStoreOrderStatus(data: any) {
  const { storeId, orderId, orderAccessToken, token } = data;
  let query = supabase.from("store_orders").select("*");
  if (orderId) query = query.eq("id", orderId);
  else if (data.orderNumber) query = query.eq("order_number", data.orderNumber);
  else throw new Error("orderId is required");
  if (storeId) query = query.or(`store_id.eq.${storeId},project_id.eq.${storeId}`);

  const { data: order, error } = await query.maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Order not found");

  const orderData = order.data || order;
  const accessHash = orderData.orderAccessTokenHash;
  if (accessHash && (await sha256(orderAccessToken || token || "")) !== accessHash) {
    throw new Error("Invalid order token");
  }

  return {
    id: order.id,
    orderNumber: order.order_number || orderData.orderNumber,
    status: order.status || orderData.status,
    paymentStatus: order.payment_status || orderData.paymentStatus,
    fulfillmentStatus: order.fulfillment_status || orderData.fulfillmentStatus,
    total: Number(order.total ?? orderData.total ?? 0),
    currency: order.currency || orderData.currency || "USD",
    items: orderData.items || [],
    trackingNumber: order.tracking_number || orderData.trackingNumber,
    trackingUrl: order.tracking_url || orderData.trackingUrl,
    carrier: order.carrier || orderData.carrier,
    createdAt: order.created_at || orderData.createdAt,
  };
}

type StripeRefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

function normalizeStripeRefundReason(value: unknown): StripeRefundReason {
  return value === "duplicate" || value === "fraudulent" ? value : "requested_by_customer";
}

function resolveOrderStoreIdentifier(order: any, fallbackStoreId?: string | null): string {
  const data = getOrderData(order);
  const storeId =
    fallbackStoreId ||
    order?.public_store_id ||
    order?.store_id ||
    data?.publicStoreId ||
    data?.public_store_id ||
    data?.storeId ||
    data?.store_id ||
    order?.project_id ||
    data?.projectId ||
    data?.project_id;
  if (!storeId) throw new Error("Order store not found");
  return storeId;
}

async function loadStoreOrderForAdminAction(data: any) {
  const { orderId, paymentIntentId, storeId } = data;
  if (!orderId && !paymentIntentId) throw new Error("orderId is required");

  let query = supabase.from("store_orders").select("*");
  if (orderId) query = query.eq("id", orderId);
  else query = query.or(`payment_intent_id.eq.${paymentIntentId},stripe_payment_intent_id.eq.${paymentIntentId}`);

  if (storeId) {
    query = query.or(`store_id.eq.${storeId},public_store_id.eq.${storeId},project_id.eq.${storeId}`);
  }

  const { data: order, error } = await query.maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Order not found");
  return order;
}

function readStoredRefunds(order: any): any[] {
  const data = getOrderData(order);
  return Array.isArray(data?.refunds) ? data.refunds : [];
}

function sumActiveRefunds(refunds: any[]): number {
  return roundMoney(refunds.reduce((sum, refund) => {
    const status = String(refund?.status || "").toLowerCase();
    if (["failed", "canceled", "cancelled"].includes(status)) return sum;
    return sum + Number(refund?.amount || 0);
  }, 0));
}

function mergeRefundRecord(refunds: any[], nextRefund: any): any[] {
  const index = refunds.findIndex((refund) => refund?.id === nextRefund.id);
  if (index === -1) return [...refunds, nextRefund];
  return refunds.map((refund, refundIndex) => refundIndex === index ? { ...refund, ...nextRefund } : refund);
}

async function createRefund(userId: string, data: any) {
  const { storeId, paymentIntentId, amount } = data;
  const reason = normalizeStripeRefundReason(data.reason);
  const order = await loadStoreOrderForAdminAction(data);
  const storeIdentifier = resolveOrderStoreIdentifier(order, storeId);
  await requireStoreOwner(userId, storeIdentifier);

  const orderData = getOrderData(order);
  const stripeData = orderData.stripe || {};
  const resolvedPaymentIntentId = paymentIntentId || getOrderPaymentIntentId(order);
  if (!resolvedPaymentIntentId) throw new Error("paymentIntentId is required");

  const paymentStatus = String(order.payment_status || orderData.paymentStatus || "pending");
  if (!["paid", "partially_refunded"].includes(paymentStatus)) {
    throw new Error("Only paid orders can be refunded");
  }

  const orderTotal = roundMoney(order.total_amount ?? order.total ?? orderData.total ?? 0);
  const existingRefunds = readStoredRefunds(order);
  const existingRefundedAmount = sumActiveRefunds(existingRefunds);
  const remainingAmount = roundMoney(Math.max(0, orderTotal - existingRefundedAmount));
  const requestedAmount = amount === undefined || amount === null || amount === ""
    ? remainingAmount
    : roundMoney(amount);

  if (requestedAmount <= 0) throw new Error("Refund amount must be greater than zero");
  if (requestedAmount - remainingAmount > 0.005) {
    throw new Error("Refund amount exceeds remaining refundable total");
  }

  const refundAmountCents = cents(requestedAmount);
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: resolvedPaymentIntentId,
    amount: refundAmountCents,
    reason,
    metadata: {
      userId,
      orderId: order.id,
      projectId: order.project_id || orderData.projectId || "",
      storeId: order.store_id || order.public_store_id || storeIdentifier,
    },
  };

  if (stripeData.connectedAccountId) {
    (refundParams as Record<string, unknown>).reverse_transfer = true;
  }
  if (Number(stripeData.applicationFeeAmount || 0) > 0) {
    (refundParams as Record<string, unknown>).refund_application_fee = true;
  }

  const refund = await stripe.refunds.create(refundParams, {
    idempotencyKey: String(
      data.idempotencyKey ||
      `refund_${order.id}_${resolvedPaymentIntentId}_${refundAmountCents}_${reason}_${existingRefunds.length}`,
    ).slice(0, 255),
  });

  const updatedAt = nowIso();
  const refundRecord = {
    id: refund.id,
    amount: roundMoney(refund.amount / 100),
    status: refund.status || "pending",
    reason: refund.reason || reason,
    source: "admin",
    createdBy: userId,
    createdAt: refund.created ? new Date(refund.created * 1000).toISOString() : updatedAt,
  };
  const refunds = mergeRefundRecord(existingRefunds, refundRecord);
  const refundedAmount = roundMoney(Math.min(orderTotal, sumActiveRefunds(refunds)));
  const isFullyRefunded = orderTotal > 0 && refundedAmount >= orderTotal - 0.005;
  const nextPaymentStatus = isFullyRefunded ? "refunded" : "partially_refunded";
  const nextStatus = isFullyRefunded ? "refunded" : (order.status || orderData.status || "processing");
  const nextStripeData = {
    ...stripeData,
    paymentIntentId: resolvedPaymentIntentId,
    lastRefundId: refund.id,
  };
  const nextData = {
    ...orderData,
    status: nextStatus,
    paymentStatus: nextPaymentStatus,
    refundedAmount,
    refunds,
    refundedAt: isFullyRefunded ? updatedAt : orderData.refundedAt,
    stripe: nextStripeData,
    updatedAt,
  };
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    payment_status: nextPaymentStatus,
    stripe: nextStripeData,
    data: nextData,
    updated_at: updatedAt,
  };
  if (isFullyRefunded) updatePayload.refunded_at = updatedAt;

  const { data: updatedOrder, error } = await supabase
    .from("store_orders")
    .update(updatePayload)
    .eq("id", order.id)
    .select("*")
    .single();
  if (error) throw error;

  return {
    refundId: refund.id,
    amount: refundRecord.amount,
    status: refund.status,
    paymentStatus: nextPaymentStatus,
    refundedAmount,
    order: updatedOrder,
  };
}

async function cancelStoreOrder(userId: string, data: any) {
  const { storeId, reason = "merchant_cancelled" } = data;
  const order = await loadStoreOrderForAdminAction(data);
  const storeIdentifier = resolveOrderStoreIdentifier(order, storeId);
  await requireStoreOwner(userId, storeIdentifier);

  const orderData = getOrderData(order);
  const stripeData = orderData.stripe || {};
  const paymentStatus = String(order.payment_status || orderData.paymentStatus || "pending");
  if (["paid", "partially_refunded", "refunded"].includes(paymentStatus)) {
    throw new Error("Paid orders must be refunded instead of cancelled directly");
  }

  const paymentIntentId = getOrderPaymentIntentId(order);
  let paymentIntentCanceled = false;
  let paymentIntentWarning: string | null = null;
  if (paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const cancellableStatuses = new Set(["requires_payment_method", "requires_confirmation", "requires_action", "requires_capture", "processing"]);
      if (cancellableStatuses.has(paymentIntent.status)) {
        await stripe.paymentIntents.cancel(paymentIntentId, {
          cancellation_reason: "requested_by_customer",
        });
        paymentIntentCanceled = true;
      } else if (paymentIntent.status === "succeeded") {
        throw new Error("PaymentIntent already succeeded; refund the order instead");
      }
    } catch (error: any) {
      if (/refund the order/i.test(error.message || "")) throw error;
      paymentIntentWarning = error.message || "Could not cancel PaymentIntent";
    }
  }

  const cancelledAt = nowIso();
  const nextStripeData = {
    ...stripeData,
    paymentIntentId: paymentIntentId || stripeData.paymentIntentId,
    paymentIntentCanceled,
    paymentIntentWarning,
  };
  const nextData = {
    ...orderData,
    status: "cancelled",
    paymentStatus: paymentStatus === "pending" ? "failed" : paymentStatus,
    cancelledAt,
    cancellation: {
      reason,
      cancelledBy: userId,
      paymentIntentCanceled,
      paymentIntentWarning,
    },
    stripe: nextStripeData,
    updatedAt: cancelledAt,
  };

  const { data: updatedOrder, error } = await supabase
    .from("store_orders")
    .update({
      status: "cancelled",
      payment_status: nextData.paymentStatus,
      cancelled_at: cancelledAt,
      stripe: nextStripeData,
      data: nextData,
      updated_at: cancelledAt,
    })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error) throw error;

  return {
    order: updatedOrder,
    paymentIntentCanceled,
    warning: paymentIntentWarning,
  };
}

async function getPaymentStatus(_userId: string, data: any) {
  const { paymentIntentId } = data;
  if (!paymentIntentId) throw new Error("paymentIntentId is required");
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    id: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    created: paymentIntent.created,
  };
}

async function createConnectAccount(userId: string, data: any) {
  const { storeId, email, businessName, country = "US" } = data;
  const context = await requireStoreOwner(userId, storeId);
  let accountId = context.settings.stripeConnectAccountId;
  let account: Stripe.Account;

  if (accountId) {
    account = await stripe.accounts.retrieve(accountId) as Stripe.Account;
  } else {
    account = await stripe.accounts.create({
      type: "express",
      country,
      email,
      business_profile: { name: businessName },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { userId, storeId, projectId: context.projectId },
    });
    accountId = account.id;
    await supabase.from("store_settings").update({
      stripe_enabled: true,
      stripe_connect_account_id: account.id,
      stripe_connect_charges_enabled: account.charges_enabled,
      stripe_connect_payouts_enabled: account.payouts_enabled,
      stripe_connect_details_submitted: account.details_submitted,
      stripe_connect_status: account.charges_enabled ? "active" : "pending",
    }).eq("project_id", context.projectId);
  }

  return {
    accountId,
    alreadyExists: Boolean(context.settings.stripeConnectAccountId),
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

async function getStoreConnectAccount(userId: string, storeId: string) {
  const context = await requireStoreOwner(userId, storeId);
  const accountId = context.settings.stripeConnectAccountId;
  if (!accountId) return { context, account: null };
  const account = await stripe.accounts.retrieve(accountId) as Stripe.Account;
  await supabase.from("store_settings").update({
    stripe_enabled: true,
    stripe_connect_charges_enabled: account.charges_enabled,
    stripe_connect_payouts_enabled: account.payouts_enabled,
    stripe_connect_details_submitted: account.details_submitted,
    stripe_connect_status: account.charges_enabled ? "active" : account.requirements?.disabled_reason ? "restricted" : "pending",
  }).eq("project_id", context.projectId);
  return { context, account };
}

async function createConnectOnboardingLink(userId: string, data: any) {
  const { storeId, returnUrl, refreshUrl } = data;
  const { account } = await getStoreConnectAccount(userId, storeId);
  if (!account) throw new Error("No Stripe Connect account linked to this store");
  const link = await stripe.accountLinks.create({
    account: account.id,
    return_url: returnUrl || `${getBaseUrl()}/dashboard/ecommerce/settings`,
    refresh_url: refreshUrl || `${getBaseUrl()}/dashboard/ecommerce/settings`,
    type: "account_onboarding",
  });
  return { url: link.url, expiresAt: link.expires_at };
}

async function createConnectLoginLink(userId: string, data: any) {
  const { storeId } = data;
  const { account } = await getStoreConnectAccount(userId, storeId);
  if (!account) throw new Error("No Stripe Connect account linked to this store");
  const link = await stripe.accounts.createLoginLink(account.id);
  return { url: link.url };
}

async function getConnectAccountStatus(userId: string, data: any) {
  const { storeId } = data;
  const { account } = await getStoreConnectAccount(userId, storeId);
  if (!account) return { connected: false, accountId: null };
  return {
    connected: true,
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    status: account.charges_enabled ? "active" : account.requirements?.disabled_reason ? "restricted" : "pending",
    requirements: {
      currentlyDue: account.requirements?.currently_due || [],
      eventuallyDue: account.requirements?.eventually_due || [],
      pastDue: account.requirements?.past_due || [],
      disabledReason: account.requirements?.disabled_reason,
    },
    capabilities: {
      cardPayments: account.capabilities?.card_payments || "inactive",
      transfers: account.capabilities?.transfers || "inactive",
    },
  };
}

async function disconnectConnectAccount(userId: string, data: any) {
  const { storeId } = data;
  const context = await requireStoreOwner(userId, storeId);
  await supabase.from("store_settings").update({
    stripe_enabled: false,
    stripe_connect_account_id: null,
    stripe_connect_charges_enabled: false,
    stripe_connect_payouts_enabled: false,
    stripe_connect_details_submitted: false,
    stripe_connect_status: null,
  }).eq("project_id", context.projectId);
  return { success: true };
}

async function createConnectPaymentIntent(userId: string, data: any) {
  const { storeId, orderId, amount, currency = "usd", customerEmail, customerName, metadata = {} } = data;
  const { account } = await getStoreConnectAccount(userId, storeId);
  if (!account?.charges_enabled) throw new Error("Stripe Connect account is not ready for charges");

  const customer = await stripe.customers.create({
    email: customerEmail,
    name: customerName,
    metadata: { userId, storeId },
  });
  const amountInCents = Number(amount) > 999 ? Math.round(Number(amount)) : cents(Number(amount));
  const platformFee = Math.round(amountInCents * 0.01);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    customer: customer.id,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: platformFee,
    transfer_data: { destination: account.id },
    metadata: { ...metadata, userId, storeId, orderId },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    customerId: customer.id,
    connectedAccountId: account.id,
    platformFee,
  };
}

async function createClientPaymentLink(userId: string, data: any) {
  const { clientTenantId, planId, customPrice } = data;
  if (!clientTenantId || !planId) throw new Error("clientTenantId and planId are required");
  const clientAccess = await requireTenantAccess(userId, clientTenantId);
  const agencyTenantId = clientAccess.tenant?.owner_tenant_id;
  if (!agencyTenantId) throw new Error("Client tenant is not linked to an agency");
  const agencyAccess = await requireTenantAccess(userId, agencyTenantId);

  const plan = await getPlan(planId).catch(() => null);
  const monthlyPrice = Number(customPrice ?? plan?.price?.monthly ?? plan?.monthly_price ?? 0);
  if (monthlyPrice <= 0) throw new Error("A valid monthly price is required");

  const token = randomToken("pay_");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const link = {
    token,
    status: "pending",
    clientTenantId,
    clientName: clientAccess.tenant?.name || clientAccess.tenant?.company_name || "Cliente",
    planId,
    planName: plan?.name || planId,
    planFeatures: plan?.features || [],
    monthlyPrice,
    expiresAt,
    createdAt: nowIso(),
  };
  const agencyBilling = agencyAccess.tenant?.billing || {};
  const paymentLinks = Array.isArray(agencyBilling.paymentLinks) ? agencyBilling.paymentLinks : [];
  await supabase.from("tenants").update({
    billing: { ...agencyBilling, paymentLinks: [...paymentLinks, link] },
    updated_at: nowIso(),
  }).eq("id", agencyTenantId);

  return { paymentUrl: `${getBaseUrl()}/pay/${token}`, expiresAt, token };
}

async function findPaymentLink(token: string) {
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id,name,email,branding,billing")
    .not("billing", "is", null);
  if (error) throw error;

  for (const tenant of tenants || []) {
    const link = (tenant.billing?.paymentLinks || []).find((item: any) => item.token === token);
    if (link) return { agency: tenant, link };
  }
  throw new Error("Payment link not found");
}

async function getPaymentLinkInfo(data: any) {
  const { token } = data;
  if (!token) throw new Error("token is required");
  const { agency, link } = await findPaymentLink(token);
  const expired = new Date(link.expiresAt).getTime() < Date.now();
  return {
    status: expired && link.status === "pending" ? "expired" : link.status,
    clientName: link.clientName,
    planName: link.planName,
    monthlyPrice: Number(link.monthlyPrice || 0),
    planFeatures: link.planFeatures || [],
    expiresAt: link.expiresAt,
    agencyName: agency.name,
    agencyLogoUrl: agency.branding?.logoUrl || agency.branding?.logo || "",
    agencyPrimaryColor: agency.branding?.primaryColor || "#4f46e5",
    agencySecondaryColor: agency.branding?.secondaryColor || "#10b981",
    agencySupportEmail: agency.email || "",
  };
}

async function confirmClientPayment(data: any) {
  const { token, paymentMethodId } = data;
  if (!token || !paymentMethodId) throw new Error("token and paymentMethodId are required");
  const { agency, link } = await findPaymentLink(token);
  if (link.status !== "pending") throw new Error("Payment link is not pending");
  if (new Date(link.expiresAt).getTime() < Date.now()) throw new Error("Payment link has expired");

  const { data: clientTenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", link.clientTenantId)
    .maybeSingle();
  if (error) throw error;
  if (!clientTenant) throw new Error("Client tenant not found");

  const customer = await stripe.customers.create({
    email: clientTenant.email || undefined,
    name: clientTenant.name || link.clientName,
    payment_method: paymentMethodId,
    invoice_settings: { default_payment_method: paymentMethodId },
    metadata: { tenantId: clientTenant.id, agencyTenantId: agency.id },
  });
  const product = await stripe.products.create({
    name: `${agency.name} - ${link.planName}`,
    metadata: { agencyTenantId: agency.id, clientTenantId: clientTenant.id, planId: link.planId },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: cents(link.monthlyPrice),
    currency: "usd",
    recurring: { interval: "month" },
  });
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
    default_payment_method: paymentMethodId,
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    metadata: { tenantId: clientTenant.id, agencyTenantId: agency.id, planId: link.planId },
  });
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | null;

  const agencyBilling = agency.billing || {};
  const paymentLinks = (agencyBilling.paymentLinks || []).map((item: any) =>
    item.token === token ? { ...item, status: "completed", completedAt: nowIso(), stripeSubscriptionId: subscription.id } : item
  );
  await supabase.from("tenants").update({
    billing: { ...agencyBilling, paymentLinks },
    updated_at: nowIso(),
  }).eq("id", agency.id);

  await supabase.from("tenants").update({
    subscription_plan: link.planId,
    billing: {
      ...(clientTenant.billing || {}),
      status: subscription.status,
      monthlyPrice: link.monthlyPrice,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
    },
    updated_at: nowIso(),
  }).eq("id", clientTenant.id);

  return {
    success: true,
    subscriptionId: subscription.id,
    requiresAction: paymentIntent?.status === "requires_action",
    clientSecret: paymentIntent?.client_secret,
  };
}

async function getAgencyBillingSummary(userId: string, data: any) {
  const { tenantId } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const agency = membership.tenant;
  const { data: clients, error } = await supabase
    .from("tenants")
    .select("id,name,billing,usage")
    .eq("owner_tenant_id", agency.id);
  if (error) throw error;

  const breakdown: Record<string, { name: string; count: number }> = {};
  let totalMonthlyBill = 0;
  let activeProjects = 0;
  for (const client of clients || []) {
    const monthly = Number(client.billing?.mrr || client.billing?.monthlyPrice || 0);
    totalMonthlyBill += monthly;
    const projectCount = Number(client.usage?.projectCount || client.billing?.projectCount || 0);
    activeProjects += projectCount;
    breakdown[client.id] = { name: client.name, count: projectCount };
  }

  return {
    isProjectBilling: Boolean(agency.billing?.projectBillingEnabled),
    plan: agency.subscription_plan || "free",
    baseFee: Number(agency.billing?.baseFee || 0),
    projectCost: Number(agency.billing?.projectCost || 0),
    poolCredits: Number(agency.billing?.poolCredits || 0),
    activeProjects,
    totalMonthlyBill,
    breakdown,
  };
}

async function updateAgencyProjectCount(userId: string, data: any) {
  const { tenantId } = data;
  const membership = await requireTenantAccess(userId, tenantId);
  const { data: clients, error } = await supabase
    .from("tenants")
    .select("id,billing,usage")
    .eq("owner_tenant_id", membership.tenant_id);
  if (error) throw error;

  for (const client of clients || []) {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", client.id)
      .eq("is_archived", false);
    await supabase.from("tenants").update({
      usage: { ...(client.usage || {}), projectCount: count || 0 },
      billing: { ...(client.billing || {}), projectCount: count || 0 },
      updated_at: nowIso(),
    }).eq("id", client.id);
  }
  return { success: true };
}

async function updateTenantLimits(userId: string, data: any) {
  const { tenantId, limits } = data;
  if (!tenantId || !limits) throw new Error("tenantId and limits are required");
  const membership = await requireTenantAccess(userId, tenantId);
  const { error } = await supabase.from("tenants").update({
    limits: { ...(membership.tenant?.limits || {}), ...limits },
    updated_at: nowIso(),
  }).eq("id", tenantId);
  if (error) throw error;
  return { success: true };
}

async function setupClientBilling(userId: string, data: any) {
  const { clientTenantId, monthlyPrice, paymentMethodId } = data;
  if (!clientTenantId || !monthlyPrice) throw new Error("clientTenantId and monthlyPrice are required");
  await requireTenantAccess(userId, clientTenantId);
  const { data: tenant, error } = await supabase.from("tenants").select("*").eq("id", clientTenantId).maybeSingle();
  if (error) throw error;
  if (!tenant) throw new Error("Client tenant not found");

  const customer = await stripe.customers.create({
    email: tenant.email || undefined,
    name: tenant.name,
    payment_method: paymentMethodId,
    invoice_settings: paymentMethodId ? { default_payment_method: paymentMethodId } : undefined,
    metadata: { tenantId: clientTenantId },
  });
  const product = await stripe.products.create({ name: `${tenant.name} Monthly Billing`, metadata: { tenantId: clientTenantId } });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: cents(monthlyPrice),
    currency: "usd",
    recurring: { interval: "month" },
  });
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
    default_payment_method: paymentMethodId,
    metadata: { tenantId: clientTenantId },
  });

  await supabase.from("tenants").update({
    billing: {
      ...(tenant.billing || {}),
      monthlyPrice,
      status: subscription.status,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
    },
    updated_at: nowIso(),
  }).eq("id", clientTenantId);
  return { success: true, subscriptionId: subscription.id };
}

async function cancelClientSubscription(userId: string, data: any) {
  const { clientTenantId, cancelImmediately = false } = data;
  await requireTenantAccess(userId, clientTenantId);
  const { data: tenant, error } = await supabase.from("tenants").select("billing").eq("id", clientTenantId).maybeSingle();
  if (error) throw error;
  const subscriptionId = tenant?.billing?.stripeSubscriptionId;
  if (subscriptionId) {
    if (cancelImmediately) await stripe.subscriptions.cancel(subscriptionId);
    else await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }
  await supabase.from("tenants").update({
    billing: { ...(tenant?.billing || {}), status: cancelImmediately ? "cancelled" : "cancelling", cancelAtPeriodEnd: !cancelImmediately },
    updated_at: nowIso(),
  }).eq("id", clientTenantId);
  return { success: true };
}

async function createStoreUser(data: any) {
  const { storeId, email, password, displayName, firstName, lastName, phone, metadata = {} } = data;
  const { projectId } = await getStoreContext(storeId);
  if (!email) throw new Error("email is required");
  const normalizedEmail = String(email).toLowerCase();
  let authUserId: string | null = null;

  if (password) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName || [firstName, lastName].filter(Boolean).join(" ") || normalizedEmail,
        store_id: storeId,
        project_id: projectId,
        account_type: "store_customer",
      },
      app_metadata: {
        account_type: "store_customer",
      },
    });

    if (createError && !String(createError.message || "").toLowerCase().includes("already")) {
      throw createError;
    }

    if (created?.user?.id) {
      authUserId = created.user.id;
    } else {
      const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      authUserId = users?.users?.find((user) => user.email?.toLowerCase() === normalizedEmail)?.id || null;
    }
  }

  const customer = await findOrCreateStoreCustomerForRegistration({
    storeId,
    projectId,
    authUserId,
    email: normalizedEmail,
    displayName,
    firstName,
    lastName,
    phone,
  });

  const existing = await findStoreUserByEmail(projectId, normalizedEmail);
  const userPayload = {
    project_id: projectId,
    public_store_id: storeId,
    auth_user_id: authUserId,
    email: normalizedEmail,
    display_name: displayName || [firstName, lastName].filter(Boolean).join(" ") || normalizedEmail,
    first_name: firstName || customer?.first_name || null,
    last_name: lastName || customer?.last_name || null,
    phone: phone || customer?.phone || null,
    customer_id: customer?.id || existing?.customer_id || null,
    role: existing?.role || "customer",
    status: existing?.status || "active",
    metadata: { ...(existing?.metadata || {}), ...metadata, authUserId, source: metadata.source || data.source || "self_register" },
    last_login_at: nowIso(),
    updated_at: nowIso(),
  };

  const query = existing
    ? supabase.from("store_users").update(userPayload).eq("id", existing.id)
    : supabase.from("store_users").insert(userPayload);
  const { data: user, error } = await query.select("*").single();
  if (error) throw error;
  return { success: true, user: await serializeStoreUserAccount(user) };
}

async function recordStoreUserLogin(data: any) {
  const { storeId, email } = data;
  const { projectId } = await getStoreContext(storeId);
  if (!email) return { success: true };
  const { error } = await supabase.from("store_users").update({ last_login_at: nowIso(), updated_at: nowIso() })
    .eq("project_id", projectId)
    .eq("email", String(email).toLowerCase());
  if (error) throw error;
  return { success: true };
}

async function findStoreUserByEmail(projectId: string, email: string) {
  const { data, error } = await supabase
    .from("store_users")
    .select("*")
    .eq("project_id", projectId)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findStoreUserByAuthId(projectId: string, authUserId: string) {
  const { data, error } = await supabase
    .from("store_users")
    .select("*")
    .eq("project_id", projectId)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findOrCreateStoreCustomerForRegistration(args: {
  storeId: string;
  projectId: string;
  authUserId: string | null;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const name = splitCustomerName(args.displayName);
  const firstName = args.firstName || name.firstName || "Customer";
  const lastName = args.lastName || name.lastName || "";
  const { data: existing, error: readError } = await supabase
    .from("store_customers")
    .select("*")
    .eq("project_id", args.projectId)
    .ilike("email", args.email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    const { data: updated, error } = await supabase
      .from("store_customers")
      .update({
        user_id: args.authUserId || existing.user_id || null,
        store_id: args.storeId,
        public_store_id: args.storeId,
        first_name: existing.first_name || firstName,
        last_name: existing.last_name || lastName,
        phone: args.phone || existing.phone || null,
        data: {
          ...(existing.data || {}),
          userId: args.authUserId || existing.user_id || null,
          storeId: args.storeId,
          publicStoreId: args.storeId,
          updatedAt: nowIso(),
        },
        updated_at: nowIso(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return updated || existing;
  }

  const { data: customer, error } = await supabase
    .from("store_customers")
    .insert({
      project_id: args.projectId,
      store_id: args.storeId,
      public_store_id: args.storeId,
      user_id: args.authUserId || null,
      email: args.email,
      first_name: firstName,
      last_name: lastName,
      phone: args.phone || null,
      total_orders: 0,
      total_spent: 0,
      addresses: [],
      accepts_marketing: false,
      data: {
        userId: args.authUserId || null,
        storeId: args.storeId,
        publicStoreId: args.storeId,
        addresses: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    })
    .select("*")
    .single();
  if (error) throw error;
  return customer;
}

async function serializeStoreUserAccount(storeUser: any) {
  const { data: customer } = storeUser.customer_id
    ? await supabase.from("store_customers").select("*").eq("id", storeUser.customer_id).maybeSingle()
    : await supabase
      .from("store_customers")
      .select("*")
      .eq("project_id", storeUser.project_id)
      .ilike("email", storeUser.email)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
  const customerData = customer?.data || {};

  return {
    id: storeUser.id,
    authUserId: storeUser.auth_user_id || storeUser.metadata?.authUserId,
    email: storeUser.email,
    displayName: storeUser.display_name,
    firstName: storeUser.first_name,
    lastName: storeUser.last_name,
    photoURL: storeUser.photo_url,
    phone: storeUser.phone,
    role: storeUser.role || "customer",
    status: storeUser.status || "active",
    segments: storeUser.segments || [],
    tags: storeUser.tags || [],
    customerId: storeUser.customer_id || customer?.id,
    addresses: customer?.addresses || customerData.addresses || [],
    defaultShippingAddress: customer?.default_shipping_address || customerData.defaultShippingAddress,
    defaultBillingAddress: customer?.default_billing_address || customerData.defaultBillingAddress,
    totalOrders: Number(storeUser.total_orders ?? customer?.total_orders ?? 0),
    totalSpent: Number(storeUser.total_spent ?? customer?.total_spent ?? 0),
    averageOrderValue: Number(storeUser.average_order_value ?? 0),
    lastLoginAt: storeUser.last_login_at,
    lastOrderAt: storeUser.last_order_at || customer?.last_order_at,
    createdAt: storeUser.created_at,
    updatedAt: storeUser.updated_at,
    metadata: storeUser.metadata || {},
    acceptsMarketing: storeUser.accepts_marketing ?? customer?.accepts_marketing ?? false,
    preferredLanguage: storeUser.preferred_language,
    internalNotes: storeUser.internal_notes,
  };
}

async function getCurrentStoreUser(userId: string, data: any) {
  const { storeId } = data;
  const { projectId } = await getStoreContext(storeId);
  let storeUser = await findStoreUserByAuthId(projectId, userId);

  if (!storeUser) {
    const { data: authUser, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    const email = authUser.user?.email?.toLowerCase();
    if (email) {
      storeUser = await findStoreUserByEmail(projectId, email);
      if (storeUser) {
        const { data: updated, error: updateError } = await supabase
          .from("store_users")
          .update({
            auth_user_id: userId,
            metadata: { ...(storeUser.metadata || {}), authUserId: userId },
            updated_at: nowIso(),
          })
          .eq("id", storeUser.id)
          .select("*")
          .single();
        if (updateError) throw updateError;
        storeUser = updated;
      }
    }
  }

  if (!storeUser) throw new Error("No existe una cuenta con este email en esta tienda");
  return { success: true, user: await serializeStoreUserAccount(storeUser) };
}

async function updateCurrentStoreUser(userId: string, data: any) {
  const { storeId, profile = {}, addresses, defaultShippingAddress, defaultBillingAddress } = data;
  const current = await getCurrentStoreUser(userId, { storeId });
  const storeUser = await findStoreUserByAuthId((await getStoreContext(storeId)).projectId, userId);
  if (!storeUser) throw new Error("Store user not found");

  const displayName = profile.displayName ?? [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const storeUserUpdates: Record<string, unknown> = {
    updated_at: nowIso(),
  };
  if (displayName) storeUserUpdates.display_name = displayName;
  if (profile.firstName !== undefined) storeUserUpdates.first_name = profile.firstName;
  if (profile.lastName !== undefined) storeUserUpdates.last_name = profile.lastName;
  if (profile.phone !== undefined) storeUserUpdates.phone = profile.phone || null;
  if (profile.acceptsMarketing !== undefined) storeUserUpdates.accepts_marketing = Boolean(profile.acceptsMarketing);
  if (profile.preferredLanguage !== undefined) storeUserUpdates.preferred_language = profile.preferredLanguage || null;

  const { data: updatedStoreUser, error: storeUserError } = await supabase
    .from("store_users")
    .update(storeUserUpdates)
    .eq("id", storeUser.id)
    .select("*")
    .single();
  if (storeUserError) throw storeUserError;

  const account = current.user;
  if (account.customerId) {
    const { data: existingCustomer, error: customerReadError } = await supabase
      .from("store_customers")
      .select("data")
      .eq("id", account.customerId)
      .maybeSingle();
    if (customerReadError) throw customerReadError;

    const customerUpdates: Record<string, unknown> = {
      updated_at: nowIso(),
    };
    if (profile.firstName !== undefined) customerUpdates.first_name = profile.firstName || "Customer";
    if (profile.lastName !== undefined) customerUpdates.last_name = profile.lastName || "";
    if (profile.phone !== undefined) customerUpdates.phone = profile.phone || null;
    if (profile.acceptsMarketing !== undefined) customerUpdates.accepts_marketing = Boolean(profile.acceptsMarketing);
    if (addresses !== undefined) customerUpdates.addresses = Array.isArray(addresses) ? addresses.map((address) => normalizeCustomerAddress(address)) : [];
    if (defaultShippingAddress !== undefined) customerUpdates.default_shipping_address = defaultShippingAddress ? normalizeCustomerAddress(defaultShippingAddress) : null;
    if (defaultBillingAddress !== undefined) customerUpdates.default_billing_address = defaultBillingAddress ? normalizeCustomerAddress(defaultBillingAddress) : null;
    customerUpdates.data = {
      ...(existingCustomer?.data || {}),
      addresses: customerUpdates.addresses ?? account.addresses ?? [],
      defaultShippingAddress: customerUpdates.default_shipping_address ?? account.defaultShippingAddress ?? null,
      defaultBillingAddress: customerUpdates.default_billing_address ?? account.defaultBillingAddress ?? null,
      updatedAt: nowIso(),
    };

    const { error: customerError } = await supabase
      .from("store_customers")
      .update(customerUpdates)
      .eq("id", account.customerId);
    if (customerError) throw customerError;
  }

  return { success: true, user: await serializeStoreUserAccount(updatedStoreUser) };
}

async function deleteCurrentStoreUser(userId: string, data: any) {
  const { storeId } = data;
  const { projectId } = await getStoreContext(storeId);
  const storeUser = await findStoreUserByAuthId(projectId, userId);
  if (!storeUser) return { success: true };

  await supabase
    .from("store_users")
    .update({
      status: "inactive",
      email: `deleted-${storeUser.id}@deleted.local`,
      display_name: "Deleted customer",
      first_name: null,
      last_name: null,
      phone: null,
      auth_user_id: null,
      metadata: { ...(storeUser.metadata || {}), deletedAt: nowIso(), deletedAuthUserId: userId },
      updated_at: nowIso(),
    })
    .eq("id", storeUser.id);

  if (storeUser.customer_id) {
    await supabase
      .from("store_customers")
      .update({
        email: `deleted-${storeUser.customer_id}@deleted.local`,
        first_name: "Deleted",
        last_name: "Customer",
        phone: null,
        user_id: null,
        data: { deletedAt: nowIso(), deletedAuthUserId: userId },
        updated_at: nowIso(),
      })
      .eq("id", storeUser.customer_id);
  }

  await supabase.auth.admin.deleteUser(userId);
  return { success: true };
}

async function resetStoreUserPassword(data: any) {
  const { storeId, userId, email } = data;
  const { projectId } = await getStoreContext(storeId);
  let targetEmail = email ? String(email).toLowerCase() : "";

  if (!targetEmail && userId) {
    const { data: storeUser, error } = await supabase
      .from("store_users")
      .select("email")
      .eq("project_id", projectId)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    targetEmail = String(storeUser?.email || "").toLowerCase();
  }

  if (!targetEmail) throw new Error("email or userId is required");

  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: Deno.env.get("STORE_AUTH_REDIRECT_URL") || Deno.env.get("APP_URL") || undefined,
  });
  if (error) throw error;

  return { success: true, message: "Password reset email sent." };
}
