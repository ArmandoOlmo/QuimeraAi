"use strict";
/**
 * Stripe Webhooks Handler
 * Handle Stripe events for Connect and subscriptions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeConnectWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
const stripe = new stripe_1.default(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
const webhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '';
/**
 * Stripe webhook endpoint for Connect accounts
 */
exports.stripeConnectWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    console.log('Received webhook event:', event.type);
    try {
        switch (event.type) {
            case 'account.updated':
                await handleAccountUpdated(event.data.object);
                break;
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send(`Webhook Error: ${error.message}`);
    }
});
/**
 * Handle account.updated event
 */
async function handleAccountUpdated(account) {
    console.log('Account updated:', account.id);
    // Find tenant with this Connect account
    const tenantsSnapshot = await db
        .collection('tenants')
        .where('billing.stripeConnectAccountId', '==', account.id)
        .limit(1)
        .get();
    if (tenantsSnapshot.empty) {
        console.log('No tenant found for Connect account:', account.id);
        return;
    }
    const tenantDoc = tenantsSnapshot.docs[0];
    // Update tenant with account status
    await tenantDoc.ref.update({
        'billing.stripeConnectStatus': account.charges_enabled ? 'active' : 'pending',
        'billing.stripeConnectChargesEnabled': account.charges_enabled,
        'billing.stripeConnectPayoutsEnabled': account.payouts_enabled,
        'billing.stripeConnectDetailsSubmitted': account.details_submitted,
        updatedAt: firestore_1.Timestamp.now(),
    });
    // Log activity if account is now active
    if (account.charges_enabled) {
        await db.collection('agencyActivity').add({
            agencyTenantId: tenantDoc.id,
            type: 'billing_activated',
            description: 'Stripe Connect activado - Ya puedes facturar a clientes',
            timestamp: firestore_1.Timestamp.now(),
        });
    }
}
/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentSucceeded(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    const clientTenantId = paymentIntent.metadata?.clientTenantId;
    const agencyTenantId = paymentIntent.metadata?.agencyTenantId;
    if (!clientTenantId || !agencyTenantId) {
        console.log('Missing tenant metadata in payment intent');
        return;
    }
    // Record payment
    await db.collection('payments').add({
        agencyTenantId,
        clientTenantId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: 'succeeded',
        createdAt: firestore_1.Timestamp.now(),
    });
    // Log activity
    const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
    const clientName = clientDoc.data()?.name || 'Cliente';
    await db.collection('agencyActivity').add({
        agencyTenantId,
        type: 'payment_received',
        clientTenantId,
        clientName,
        description: `Pago recibido: $${(paymentIntent.amount / 100).toFixed(2)}`,
        metadata: {
            amount: paymentIntent.amount / 100,
            paymentIntentId: paymentIntent.id,
        },
        timestamp: firestore_1.Timestamp.now(),
    });
}
/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentFailed(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    const clientTenantId = paymentIntent.metadata?.clientTenantId;
    const agencyTenantId = paymentIntent.metadata?.agencyTenantId;
    if (!clientTenantId || !agencyTenantId) {
        return;
    }
    // Update client billing status
    await db.collection('tenants').doc(clientTenantId).update({
        'billing.status': 'payment_failed',
        'billing.lastPaymentError': paymentIntent.last_payment_error?.message || 'Payment failed',
        updatedAt: firestore_1.Timestamp.now(),
    });
    // Log activity
    const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
    const clientName = clientDoc.data()?.name || 'Cliente';
    await db.collection('agencyActivity').add({
        agencyTenantId,
        type: 'payment_failed',
        clientTenantId,
        clientName,
        description: `Pago fallido: ${paymentIntent.last_payment_error?.message || 'Error desconocido'}`,
        metadata: {
            amount: paymentIntent.amount / 100,
            error: paymentIntent.last_payment_error?.message,
        },
        timestamp: firestore_1.Timestamp.now(),
    });
    // TODO: Send notification email to agency owner
}
/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log('Invoice payment succeeded:', invoice.id);
    const subscription = invoice.subscription;
    if (!subscription)
        return;
    // Find client with this subscription
    const clientsSnapshot = await db
        .collection('tenants')
        .where('billing.stripeSubscriptionId', '==', subscription)
        .limit(1)
        .get();
    if (clientsSnapshot.empty) {
        console.log('No client found for subscription:', subscription);
        return;
    }
    const clientDoc = clientsSnapshot.docs[0];
    const clientData = clientDoc.data();
    // Update billing status
    await clientDoc.ref.update({
        'billing.status': 'active',
        'billing.lastPaymentDate': firestore_1.Timestamp.fromDate(new Date(invoice.created * 1000)),
        'billing.lastPaymentAmount': invoice.amount_paid / 100,
        updatedAt: firestore_1.Timestamp.now(),
    });
    // Calculate MRR
    const monthlyAmount = invoice.amount_paid / 100;
    await clientDoc.ref.update({
        'billing.mrr': monthlyAmount,
    });
    // Record payment
    await db.collection('payments').add({
        agencyTenantId: clientData.ownerTenantId,
        clientTenantId: clientDoc.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'succeeded',
        createdAt: firestore_1.Timestamp.now(),
    });
}
/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
    console.log('Invoice payment failed:', invoice.id);
    const subscription = invoice.subscription;
    if (!subscription)
        return;
    const clientsSnapshot = await db
        .collection('tenants')
        .where('billing.stripeSubscriptionId', '==', subscription)
        .limit(1)
        .get();
    if (clientsSnapshot.empty)
        return;
    const clientDoc = clientsSnapshot.docs[0];
    const clientData = clientDoc.data();
    // Update status
    await clientDoc.ref.update({
        'billing.status': 'payment_failed',
        'billing.lastPaymentError': 'Invoice payment failed',
        status: 'suspended', // Suspend client access
        updatedAt: firestore_1.Timestamp.now(),
    });
    // Log activity
    await db.collection('agencyActivity').add({
        agencyTenantId: clientData.ownerTenantId,
        type: 'payment_failed',
        clientTenantId: clientDoc.id,
        clientName: clientData.name,
        description: 'Pago de factura fallido - Cliente suspendido',
        metadata: {
            invoiceId: invoice.id,
            amount: invoice.amount_due / 100,
        },
        timestamp: firestore_1.Timestamp.now(),
    });
}
/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('Subscription deleted:', subscription.id);
    const clientsSnapshot = await db
        .collection('tenants')
        .where('billing.stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get();
    if (clientsSnapshot.empty)
        return;
    const clientDoc = clientsSnapshot.docs[0];
    const clientData = clientDoc.data();
    // Update status
    await clientDoc.ref.update({
        'billing.status': 'cancelled',
        'billing.cancelledAt': firestore_1.Timestamp.now(),
        status: 'cancelled',
        updatedAt: firestore_1.Timestamp.now(),
    });
    // Log activity
    await db.collection('agencyActivity').add({
        agencyTenantId: clientData.ownerTenantId,
        type: 'client_subscription_cancelled',
        clientTenantId: clientDoc.id,
        clientName: clientData.name,
        description: 'Suscripción cancelada',
        timestamp: firestore_1.Timestamp.now(),
    });
}
/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription) {
    console.log('Subscription updated:', subscription.id);
    const clientsSnapshot = await db
        .collection('tenants')
        .where('billing.stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get();
    if (clientsSnapshot.empty)
        return;
    const clientDoc = clientsSnapshot.docs[0];
    // Update next billing date
    await clientDoc.ref.update({
        'billing.nextBillingDate': firestore_1.Timestamp.fromDate(new Date(subscription.current_period_end * 1000)),
        updatedAt: firestore_1.Timestamp.now(),
    });
}
/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(charge) {
    console.log('Charge refunded:', charge.id);
    const paymentIntent = charge.payment_intent;
    if (!paymentIntent)
        return;
    // Find payment record
    const paymentsSnapshot = await db
        .collection('payments')
        .where('stripePaymentIntentId', '==', paymentIntent)
        .limit(1)
        .get();
    if (paymentsSnapshot.empty)
        return;
    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentData = paymentDoc.data();
    // Update payment status
    await paymentDoc.ref.update({
        status: 'refunded',
        refundedAt: firestore_1.Timestamp.now(),
        refundAmount: charge.amount_refunded / 100,
    });
    // Log activity
    const clientDoc = await db.collection('tenants').doc(paymentData.clientTenantId).get();
    const clientName = clientDoc.data()?.name || 'Cliente';
    await db.collection('agencyActivity').add({
        agencyTenantId: paymentData.agencyTenantId,
        type: 'payment_refunded',
        clientTenantId: paymentData.clientTenantId,
        clientName,
        description: `Reembolso procesado: $${(charge.amount_refunded / 100).toFixed(2)}`,
        metadata: {
            amount: charge.amount_refunded / 100,
            chargeId: charge.id,
        },
        timestamp: firestore_1.Timestamp.now(),
    });
}
//# sourceMappingURL=stripeWebhooks.js.map