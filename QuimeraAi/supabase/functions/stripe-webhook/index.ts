import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature || !endpointSecret) {
    return new Response('Missing signature or endpoint secret', { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error(`Error processing webhook event: ${error.message}`);
    return new Response(`Webhook Error: ${error.message}`, { status: 500 });
  }
});

// Handlers for specific events

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { storeId, orderId } = paymentIntent.metadata;

  if (storeId && orderId) {
    // E-commerce store order
    const { data: order, error } = await supabase
      .from('store_orders')
      .select('data')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .single();

    if (!error && order) {
      const orderData = order.data as any;
      orderData.status = 'processing';
      orderData.paymentStatus = 'paid';
      orderData.updatedAt = new Date().toISOString();

      await supabase
        .from('store_orders')
        .update({ data: orderData })
        .eq('id', orderId)
        .eq('store_id', storeId);
      
      console.log(`Order ${orderId} marked as paid.`);
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { storeId, orderId } = paymentIntent.metadata;

  if (storeId && orderId) {
    const { data: order, error } = await supabase
      .from('store_orders')
      .select('data')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .single();

    if (!error && order) {
      const orderData = order.data as any;
      orderData.paymentStatus = 'failed';
      orderData.updatedAt = new Date().toISOString();

      await supabase
        .from('store_orders')
        .update({ data: orderData })
        .eq('id', orderId)
        .eq('store_id', storeId);
      
      console.log(`Order ${orderId} marked as failed.`);
    }
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const type = metadata.type;
  
  if (type === 'credit_package') {
    const cpTenantId = metadata.tenantId || metadata.clientTenantId;
    const packageId = metadata.packageId;
    const creditsAmount = parseInt(metadata.credits || '0', 10);
    
    if (cpTenantId && creditsAmount > 0) {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('data')
        .eq('id', cpTenantId)
        .single();
        
      if (!error && tenant) {
        const tenantData = tenant.data as any;
        tenantData.aiCreditsUsage = tenantData.aiCreditsUsage || {};
        tenantData.aiCreditsUsage.creditsRemaining = (tenantData.aiCreditsUsage.creditsRemaining || 0) + creditsAmount;
        tenantData.aiCreditsUsage.creditsIncluded = (tenantData.aiCreditsUsage.creditsIncluded || 0) + creditsAmount;
        tenantData.updatedAt = new Date().toISOString();
        
        await supabase
          .from('tenants')
          .update({ data: tenantData })
          .eq('id', cpTenantId);
      }
    }
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const tenantId = metadata.tenantId || metadata.clientTenantId;
  const planId = metadata.planId;

  if (tenantId) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('data')
      .eq('id', tenantId)
      .single();

    if (!error && tenant) {
      const tenantData = tenant.data as any;
      tenantData.subscriptionPlan = planId || tenantData.subscriptionPlan || 'free';
      tenantData.subscriptionStatus = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status;
      
      const limitsMap: Record<string, any> = {
        free: { maxProjects: 1, maxUsers: 1, maxStorageGB: 0.5, maxAiCredits: 60 },
        starter: { maxProjects: 5, maxUsers: 2, maxStorageGB: 5, maxAiCredits: 300 },
        pro: { maxProjects: 20, maxUsers: 10, maxStorageGB: 50, maxAiCredits: 1500 },
        agency: { maxProjects: 50, maxUsers: 25, maxStorageGB: 200, maxAiCredits: 5000, maxSubClients: 10, maxReports: 50, maxApiCalls: 10000 },
        enterprise: { maxProjects: 1000, maxUsers: 500, maxStorageGB: 2000, maxAiCredits: 25000, maxSubClients: 100, maxReports: -1, maxApiCalls: -1 },
      };
      
      tenantData.limits = limitsMap[tenantData.subscriptionPlan] || limitsMap.free;
      
      if (!tenantData.billingInfo) tenantData.billingInfo = {};
      tenantData.billingInfo.stripeSubscriptionId = subscription.id;
      tenantData.billingInfo.stripeCustomerId = subscription.customer as string;
      tenantData.billingInfo.nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();
      
      tenantData.updatedAt = new Date().toISOString();

      await supabase
        .from('tenants')
        .update({ data: tenantData })
        .eq('id', tenantId);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  const tenantId = metadata.tenantId || metadata.clientTenantId;

  if (tenantId) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('data')
      .eq('id', tenantId)
      .single();

    if (!error && tenant) {
      const tenantData = tenant.data as any;
      tenantData.subscriptionPlan = 'free';
      tenantData.subscriptionStatus = 'cancelled';
      
      const limitsMap: Record<string, any> = { free: { maxProjects: 1, maxUsers: 1, maxStorageGB: 0.5, maxAiCredits: 60 } };
      tenantData.limits = limitsMap.free;
      
      if (tenantData.billingInfo) {
        tenantData.billingInfo.mrr = 0;
        tenantData.billingInfo.lastSyncedAt = new Date().toISOString();
      }
      
      tenantData.updatedAt = new Date().toISOString();

      await supabase
        .from('tenants')
        .update({ data: tenantData })
        .eq('id', tenantId);
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Can be used to reset monthly credits or trigger emails
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Mark subscription as past due and trigger warning emails
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Process refunds on store orders
}
