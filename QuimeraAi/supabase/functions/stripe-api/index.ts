import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

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

const PUBLIC_ACTIONS = new Set([
  "agencyBilling-getPaymentLinkInfo",
  "agencyBilling-confirmClientPayment",
  "createStoreCheckoutIntent",
  "getStoreOrderStatus",
  "trackOrder",
  "storeUsers-create",
  "storeUsers-recordLogin",
  "storeUsers-resetPassword",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();
    const isPublicAction = PUBLIC_ACTIONS.has(action) || (action === "createCheckoutSession" && !payload.planId);
    const authHeader = req.headers.get("Authorization");
    let user: any = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data, error: authError } = await supabase.auth.getUser(token);
      if (!authError && data.user) user = data.user;
    }

    if (!isPublicAction && !user) throw new Error("Invalid or missing user token");
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
      case "getPaymentStatus":
        result = await getPaymentStatus(user.id, payload);
        break;
      case "createStoreCheckoutIntent":
        result = await createStoreCheckoutIntent(payload);
        break;
      case "getStoreOrderStatus":
      case "trackOrder":
        result = await getStoreOrderStatus(payload);
        break;
      case "storeUsers-create":
        result = await createStoreUser(payload);
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
  const planId = subscription.metadata?.planId || "free";
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === "year" ? "annually" : "monthly";
  const existing = await getLocalSubscription(tenantId);
  const usage = await normalizedCreditsUsage(tenantId, planId, existing?.ai_credits_usage);

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
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);
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

  const plan = await getPlan(planId).catch(() => null);
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
    taxEnabled: settingsRow.tax_enabled ?? settingsRow.data?.taxEnabled,
    taxRate: Number(settingsRow.tax_rate ?? settingsRow.data?.taxRate ?? 0),
    storeName: settingsRow.store_name || settingsRow.data?.storeName || "Store",
  };

  return { storeId, projectId, ownerId, settingsRow, settings, publicStore };
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
    name: row.name || data.name,
    status: row.status || data.status,
    price: Number(row.price ?? data.price ?? 0),
    quantity: Number(row.quantity ?? data.quantity ?? 0),
    trackInventory: row.track_inventory ?? data.trackInventory ?? data.track_inventory ?? true,
    hasVariants: row.has_variants ?? data.hasVariants ?? false,
    variants: row.variants || data.variants || [],
    images: row.images || data.images || [],
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

async function buildStoreOrder(data: any) {
  const {
    storeId,
    items = [],
    customerEmail,
    customerName,
    customerPhone,
    shippingAddress,
    billingAddress,
    shippingMethodId,
    idempotencyKey = randomToken("checkout_"),
    notes,
  } = data;

  const context = await getStoreContext(storeId);
  const { projectId, ownerId, settings } = context;
  const currency = String(settings.currency || "USD").toLowerCase();
  const connectedAccountId = settings.stripeConnectAccountId;

  if (!settings.stripeEnabled || !connectedAccountId || !settings.stripeConnectChargesEnabled) {
    throw new Error("Store is not ready to accept payments");
  }

  let subtotal = 0;
  const canonicalItems = [];
  for (const item of items) {
    if (Number(item.quantity) <= 0) throw new Error("Invalid quantity");
    const product = await getStoreProduct(projectId, item.productId);
    if (product.status !== "active") throw new Error(`Product ${product.name} is not available`);

    let availableQuantity = product.quantity;
    let price = product.price;
    let variantName = null;
    if (item.variantId && product.hasVariants) {
      const variant = product.variants.find((variant: any) => variant.id === item.variantId);
      if (!variant) throw new Error("Variant not found");
      availableQuantity = Number(variant.quantity || 0);
      price = Number(variant.price || price);
      variantName = variant.name;
    }

    if (product.trackInventory !== false && availableQuantity < Number(item.quantity)) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const totalPrice = price * Number(item.quantity);
    subtotal += totalPrice;
    canonicalItems.push({
      productId: item.productId,
      variantId: item.variantId || null,
      name: variantName ? `${product.name} - ${variantName}` : product.name,
      productName: product.name,
      variantName,
      imageUrl: product.images?.[0]?.url || product.images?.[0] || null,
      quantity: Number(item.quantity),
      unitPrice: price,
      totalPrice,
    });
  }

  let shippingTotal = 0;
  let shippingMethodName = "Standard";
  const zones = Array.isArray(settings.shippingZones) ? settings.shippingZones : [];
  const allRates = zones.flatMap((zone: any) => zone.rates || []);
  const selectedRate = allRates.find((rate: any) => rate.id === shippingMethodId) || allRates[0];
  if (selectedRate) {
    shippingTotal = Number(selectedRate.price || 0);
    shippingMethodName = selectedRate.name || "Standard";
    if (settings.freeShippingThreshold && subtotal >= Number(settings.freeShippingThreshold)) {
      shippingTotal = 0;
      shippingMethodName = "Free Shipping";
    }
  }

  const taxTotal = settings.taxEnabled ? subtotal * (Number(settings.taxRate || 0) / 100) : 0;
  const total = Math.max(0, subtotal + shippingTotal + taxTotal);
  const cartHash = await sha256(JSON.stringify({ items, shippingMethodId, total }));
  const orderNumber = `ORD-${String(idempotencyKey).replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 32).toUpperCase()}`;
  const accessToken = randomToken("ord_");
  const accessTokenHash = await sha256(accessToken);

  return {
    context,
    projectId,
    ownerId,
    connectedAccountId,
    currency,
    orderNumber,
    accessToken,
    accessTokenHash,
    cartHash,
    data: {
      orderNumber,
      customerEmail,
      customerName,
      customerPhone: customerPhone || null,
      items: canonicalItems,
      subtotal,
      discount: 0,
      discountAmount: 0,
      shippingCost: shippingTotal,
      taxAmount: taxTotal,
      total,
      currency,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "stripe",
      shippingMethod: shippingMethodName,
      notes: notes || null,
      checkoutIdempotencyKey: idempotencyKey,
      orderAccessToken: accessToken,
      orderAccessTokenHash: accessTokenHash,
      cartHash,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  };
}

async function createStoreCheckoutIntent(data: any) {
  const order = await buildStoreOrder(data);

  const { data: existing } = await supabase
    .from("store_orders")
    .select("*")
    .eq("project_id", order.projectId)
    .eq("order_number", order.orderNumber)
    .maybeSingle();

  if (existing) {
    const existingData = existing.data || existing;
    if (existingData.cartHash && existingData.cartHash !== order.cartHash) {
      throw new Error("Checkout already exists for a different cart. Refresh checkout and try again.");
    }
    return {
      clientSecret: existingData.stripe?.clientSecret,
      orderId: existing.id,
      orderNumber: existing.order_number || existingData.orderNumber,
      orderAccessToken: existingData.orderAccessToken,
      total: Number(existing.total ?? existingData.total ?? 0),
      cartHash: existingData.cartHash,
    };
  }

  const platformFee = Math.round(order.data.total * 0.01 * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: cents(order.data.total),
    currency: order.currency,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: platformFee > 0 ? platformFee : undefined,
    transfer_data: { destination: order.connectedAccountId },
    metadata: {
      storeId: order.context.storeId,
      projectId: order.projectId,
      ownerId: order.ownerId || "",
      orderNumber: order.orderNumber,
      cartHash: order.cartHash,
    },
  }, { idempotencyKey: `pi_${order.orderNumber}` });

  const orderData = {
    ...order.data,
    stripe: {
      paymentIntentId: paymentIntent.id,
      connectedAccountId: order.connectedAccountId,
      clientSecret: paymentIntent.client_secret,
    },
  };

  const { data: inserted, error } = await supabase
    .from("store_orders")
    .insert({
      store_id: order.context.storeId,
      user_id: order.ownerId,
      project_id: order.projectId,
      order_number: order.orderNumber,
      customer_email: orderData.customerEmail,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      subtotal: orderData.subtotal,
      discount: 0,
      shipping_cost: orderData.shippingCost,
      tax_amount: orderData.taxAmount,
      total: orderData.total,
      currency: orderData.currency.toUpperCase(),
      shipping_address: orderData.shippingAddress,
      billing_address: orderData.billingAddress,
      status: "pending",
      payment_status: "pending",
      fulfillment_status: "unfulfilled",
      payment_method: "stripe",
      payment_intent_id: paymentIntent.id,
      notes: orderData.notes,
      data: orderData,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    orderId: inserted.id,
    orderNumber: order.orderNumber,
    orderAccessToken: order.accessToken,
    total: orderData.total,
    cartHash: order.cartHash,
  };
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

async function createRefund(userId: string, data: any) {
  const { storeId, paymentIntentId, orderId, amount, reason = "requested_by_customer" } = data;
  if (storeId) await requireStoreOwner(userId, storeId);

  let resolvedPaymentIntentId = paymentIntentId;
  if (!resolvedPaymentIntentId && orderId) {
    const { data: order } = await supabase.from("store_orders").select("*").eq("id", orderId).maybeSingle();
    resolvedPaymentIntentId = order?.payment_intent_id || order?.data?.stripe?.paymentIntentId;
  }
  if (!resolvedPaymentIntentId) throw new Error("paymentIntentId is required");

  const refund = await stripe.refunds.create({
    payment_intent: resolvedPaymentIntentId,
    amount: amount ? cents(amount) : undefined,
    reason,
    metadata: { userId, orderId: orderId || "" },
  });

  return { refundId: refund.id, amount: refund.amount / 100, status: refund.status };
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

  const { data: user, error } = await supabase.from("store_users").upsert({
    project_id: projectId,
    email: normalizedEmail,
    display_name: displayName || [firstName, lastName].filter(Boolean).join(" ") || normalizedEmail,
    first_name: firstName || null,
    last_name: lastName || null,
    phone: phone || null,
    metadata: { ...metadata, authUserId },
    last_login_at: nowIso(),
  }, { onConflict: "project_id,email" }).select("*").single();
  if (error) throw error;
  return { success: true, user };
}

async function recordStoreUserLogin(data: any) {
  const { storeId, email } = data;
  const { projectId } = await getStoreContext(storeId);
  if (!email) return { success: true };
  const { error } = await supabase.from("store_users").update({ last_login_at: nowIso() })
    .eq("project_id", projectId)
    .eq("email", String(email).toLowerCase());
  if (error) throw error;
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
