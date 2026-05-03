import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) throw new Error('Invalid token');
    
    const { action, ...payload } = await req.json();

    let result;

    switch (action) {
      case 'createPaymentIntent':
        result = await createPaymentIntent(user.id, payload);
        break;
      case 'createCheckoutSession':
        result = await createCheckoutSession(user.id, payload);
        break;
      case 'createCreditPackageCheckout':
        result = await createCreditPackageCheckout(user.id, payload);
        break;
      case 'getStripeConnectStatus':
        result = await getStripeConnectStatus(user.id, payload);
        break;
      case 'createStripeConnectAccount':
        result = await createStripeConnectAccount(user.id, payload);
        break;
      case 'updateClientMonthlyPrice':
        result = await updateClientMonthlyPrice(user.id, payload);
        break;
      case 'updateSubscriptionAddons':
        result = await updateSubscriptionAddons(user.id, payload);
        break;
      case 'getAddonsPricing':
        result = await getAddonsPricing(user.id, payload);
        break;
      default:
        throw new Error('Unknown action');
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createPaymentIntent(userId: string, data: any) {
  const { amount, currency = 'usd', metadata } = data;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: { ...metadata, userId },
  });

  return { clientSecret: paymentIntent.client_secret };
}

async function createCheckoutSession(userId: string, data: any) {
  const { planId, billingCycle, tenantId, successUrl, cancelUrl, customerEmail, metadata } = data;

  // Real world: lookup priceId by planId and billingCycle
  const priceId = 'price_placeholder'; 

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    metadata: { ...metadata, userId, tenantId, planId },
  });

  return { id: session.id, url: session.url, success: true };
}

async function createCreditPackageCheckout(userId: string, data: any) {
  const { packageId, tenantId, successUrl, cancelUrl } = data;

  // Assuming priceId is looked up based on packageId or passed in
  // For simplicity, requiring priceId or hardcoding a lookup
  // In a real scenario, fetch package details from DB or constant
  const priceId = 'price_placeholder'; 

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { type: 'credit_package', tenantId, packageId, userId },
  });

  return { id: session.id, url: session.url, success: true };
}

async function getStripeConnectStatus(userId: string, data: any) {
  const { tenantId } = data;
  const { data: tenant } = await supabase.from('tenants').select('stripe_account_id').eq('id', tenantId).single();
  if (!tenant?.stripe_account_id) return { isConnected: false };

  const account = await stripe.accounts.retrieve(tenant.stripe_account_id);
  return { 
    isConnected: account.details_submitted,
    accountId: account.id,
    detailsSubmitted: account.details_submitted
  };
}

async function createStripeConnectAccount(userId: string, data: any) {
  const { tenantId } = data;
  let accountId;
  const { data: tenant } = await supabase.from('tenants').select('stripe_account_id').eq('id', tenantId).single();
  
  if (tenant?.stripe_account_id) {
    accountId = tenant.stripe_account_id;
  } else {
    const account = await stripe.accounts.create({ type: 'express' });
    accountId = account.id;
    await supabase.from('tenants').update({ stripe_account_id: accountId }).eq('id', tenantId);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${Deno.env.get('PUBLIC_URL') || 'http://localhost:8080'}/dashboard/billing`,
    return_url: `${Deno.env.get('PUBLIC_URL') || 'http://localhost:8080'}/dashboard/billing`,
    type: 'account_onboarding',
  });

  return { url: accountLink.url };
}

async function updateClientMonthlyPrice(userId: string, data: any) {
  const { clientId, price } = data;
  
  // NOTE: This represents a mock implementation.
  // In production, we'd update a Stripe Subscription and update Supabase.
  const { error } = await supabase.from('tenants').update({ 
    billing_info: { monthlyPrice: price }
  }).eq('id', clientId);
  
  if (error) throw error;
  return { success: true };
}

async function updateSubscriptionAddons(userId: string, data: any) {
  const { tenantId, addons } = data;
  
  // NOTE: This represents a mock implementation.
  // In production, we'd update Stripe Subscription items and update Supabase.
  
  const { error } = await supabase.from('tenants').update({
    addons: addons
  }).eq('id', tenantId);
  
  if (error) throw error;
  return { success: true, newMonthlyTotal: 0 }; 
}

async function getAddonsPricing(userId: string, data: any) {
  return {
    pricing: {
      extraSubClients: 15,
      extraStorageGB: 10,
      extraAiCredits: 20,
    }
  };
}
