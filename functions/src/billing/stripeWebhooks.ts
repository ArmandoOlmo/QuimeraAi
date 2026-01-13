/**
 * Stripe Webhooks for Agency Billing
 * Handles Stripe webhook events for subscriptions and payments
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();
const stripe = new Stripe(functions.config().stripe.secret_key);

const webhookSecret = functions.config().stripe.webhook_secret;

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export const stripeConnectWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    functions.logger.error('Webhook signature verification failed', { error: err.message });
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  functions.logger.info('Stripe webhook received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        functions.logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error: any) {
    functions.logger.error('Error processing webhook', { error: error.message, type: event.type });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  functions.logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });

  const clientTenantId = paymentIntent.metadata?.clientTenantId;
  const agencyTenantId = paymentIntent.metadata?.agencyTenantId;

  if (!clientTenantId || !agencyTenantId) {
    functions.logger.warn('Payment intent missing metadata', { paymentIntentId: paymentIntent.id });
    return;
  }

  // Record payment in invoices collection
  await db.collection('invoices').add({
    agencyTenantId,
    clientTenantId,
    stripePaymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    status: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update client tenant billing status
  await db.collection('tenants').doc(clientTenantId).update({
    'billing.status': 'active',
    'billing.lastPaymentAt': admin.firestore.FieldValue.serverTimestamp(),
    'billing.lastPaymentAmount': paymentIntent.amount / 100,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Record activity
  await db.collection('agencyActivity').add({
    agencyTenantId,
    type: 'payment_received',
    clientTenantId,
    clientName: (await db.collection('tenants').doc(clientTenantId).get()).data()?.name,
    amount: paymentIntent.amount / 100,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Payment recorded successfully', { clientTenantId, amount: paymentIntent.amount / 100 });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  functions.logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });

  const clientTenantId = paymentIntent.metadata?.clientTenantId;
  const agencyTenantId = paymentIntent.metadata?.agencyTenantId;

  if (!clientTenantId || !agencyTenantId) {
    return;
  }

  // Update client status to payment_failed
  await db.collection('tenants').doc(clientTenantId).update({
    'billing.status': 'payment_failed',
    'billing.lastFailedPaymentAt': admin.firestore.FieldValue.serverTimestamp(),
    status: 'suspended',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Record activity
  await db.collection('agencyActivity').add({
    agencyTenantId,
    type: 'payment_failed',
    clientTenantId,
    clientName: (await db.collection('tenants').doc(clientTenantId).get()).data()?.name,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // TODO: Send notification email to agency owner and client

  functions.logger.info('Payment failure recorded', { clientTenantId });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  functions.logger.info('Invoice payment succeeded', { invoiceId: invoice.id });

  const clientTenantId = invoice.metadata?.clientTenantId;
  const agencyTenantId = invoice.metadata?.agencyTenantId;

  if (!clientTenantId || !agencyTenantId) {
    return;
  }

  // Find and update invoice record
  const invoiceSnapshot = await db.collection('invoices')
    .where('stripeInvoiceId', '==', invoice.id)
    .limit(1)
    .get();

  if (!invoiceSnapshot.empty) {
    await invoiceSnapshot.docs[0].ref.update({
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Update billing status
  await db.collection('tenants').doc(clientTenantId).update({
    'billing.status': 'active',
    'billing.lastPaymentAt': admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  functions.logger.warn('Invoice payment failed', { invoiceId: invoice.id });

  const clientTenantId = invoice.metadata?.clientTenantId;
  const agencyTenantId = invoice.metadata?.agencyTenantId;

  if (!clientTenantId || !agencyTenantId) {
    return;
  }

  // Update invoice record
  const invoiceSnapshot = await db.collection('invoices')
    .where('stripeInvoiceId', '==', invoice.id)
    .limit(1)
    .get();

  if (!invoiceSnapshot.empty) {
    await invoiceSnapshot.docs[0].ref.update({
      status: 'failed',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Suspend client
  await db.collection('tenants').doc(clientTenantId).update({
    'billing.status': 'payment_failed',
    status: 'suspended',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Record activity
  await db.collection('agencyActivity').add({
    agencyTenantId,
    type: 'invoice_payment_failed',
    clientTenantId,
    invoiceId: invoice.id,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  functions.logger.info('Subscription updated', { subscriptionId: subscription.id });

  const clientTenantId = subscription.metadata?.clientTenantId;

  if (!clientTenantId) {
    return;
  }

  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
  if (!clientDoc.exists) {
    functions.logger.warn('Client tenant not found for subscription', { clientTenantId });
    return;
  }

  // Update subscription info
  const subscriptionData = subscription as any;
  await db.collection('tenants').doc(clientTenantId).update({
    'billing.status': subscriptionData.status,
    'billing.nextBillingDate': admin.firestore.Timestamp.fromDate(
      new Date(subscriptionData.current_period_end * 1000)
    ),
    'billing.cancelAtPeriodEnd': subscriptionData.cancel_at_period_end,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  functions.logger.info('Subscription deleted', { subscriptionId: subscription.id });

  const clientTenantId = subscription.metadata?.clientTenantId;
  const agencyTenantId = subscription.metadata?.agencyTenantId;

  if (!clientTenantId || !agencyTenantId) {
    return;
  }

  // Update client status
  await db.collection('tenants').doc(clientTenantId).update({
    'billing.status': 'canceled',
    'billing.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
    status: 'suspended',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Record activity
  await db.collection('agencyActivity').add({
    agencyTenantId,
    type: 'subscription_canceled',
    clientTenantId,
    clientName: (await db.collection('tenants').doc(clientTenantId).get()).data()?.name,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleAccountUpdated(account: Stripe.Account) {
  functions.logger.info('Stripe Connect account updated', { accountId: account.id });

  const tenantId = account.metadata?.tenantId;
  if (!tenantId) {
    return;
  }

  // Update Stripe Connect status
  const status = account.details_submitted ? 'active' : 'pending';

  await db.collection('tenants').doc(tenantId).update({
    'billing.stripeConnectStatus': status,
    'billing.stripeConnectChargesEnabled': account.charges_enabled,
    'billing.stripeConnectPayoutsEnabled': account.payouts_enabled,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Stripe Connect account status updated', { tenantId, status });
}
