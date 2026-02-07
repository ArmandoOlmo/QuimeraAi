/**
 * Stripe API Cloud Functions
 * Handles payment processing for the ecommerce module
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from './config';

// Initialize Stripe with secret key from centralized config
const getStripe = () => {
    const secretKey = STRIPE_CONFIG.secretKey;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY not configured in .env');
    }
    return new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia' as any,
    });
};

// Initialize Firestore
const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

interface CreatePaymentIntentRequest {
    userId: string;
    storeId?: string;
    orderId: string;
    amount: number; // in cents
    currency: string;
    customerEmail: string;
    customerName: string;
    metadata?: Record<string, string>;
}

interface OrderItem {
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    price: number;
}

interface CreateOrderRequest {
    userId: string;
    storeId?: string;
    items: OrderItem[];
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    shippingAddress: {
        firstName: string;
        lastName: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone?: string;
    };
    billingAddress?: {
        firstName: string;
        lastName: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    discountCode?: string;
    shippingCost: number;
    taxAmount: number;
    notes?: string;
}

// ============================================================================
// CREATE PAYMENT INTENT
// ============================================================================

/**
 * SECURITY: Validate email format
 */
function isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * SECURITY: Validate string input
 */
function sanitizeString(str: unknown, maxLength: number = 500): string {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

/**
 * SECURITY: Validate ID format (alphanumeric with hyphens/underscores)
 */
function isValidId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

/**
 * Creates a Stripe Payment Intent for an order
 * SECURITY: Authentication required, input validation enforced
 */
export const createPaymentIntent = functions.https.onCall(
    async (data: CreatePaymentIntentRequest, context) => {
        // SECURITY: Require authentication for payment operations
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to create payments');
        }

        // SECURITY: Sanitize and validate all inputs
        const userId = sanitizeString(data.userId, 128);
        const storeId = data.storeId ? sanitizeString(data.storeId, 100) : undefined;
        const orderId = sanitizeString(data.orderId, 100);
        const amount = typeof data.amount === 'number' ? data.amount : 0;
        const currency = sanitizeString(data.currency, 10);
        const customerEmail = sanitizeString(data.customerEmail, 254);
        const customerName = sanitizeString(data.customerName, 200);
        const metadata = data.metadata || {};

        // SECURITY: Validate required fields
        if (!userId || !orderId || !amount || !currency || !customerEmail) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields: userId, orderId, amount, currency, customerEmail'
            );
        }

        // SECURITY: Verify the authenticated user matches the userId
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'User ID mismatch - you can only create payments for yourself'
            );
        }

        // SECURITY: Validate ID formats
        if (!isValidId(userId) || !isValidId(orderId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid ID format');
        }

        // SECURITY: Validate email
        if (!isValidEmail(customerEmail)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }

        // SECURITY: Validate amount (positive, reasonable max)
        if (amount <= 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than 0');
        }

        if (amount > 100000000) { // Max $1,000,000 in cents
            throw new functions.https.HttpsError('invalid-argument', 'Amount exceeds maximum allowed');
        }

        // SECURITY: Validate currency (3-letter ISO code)
        if (!/^[a-zA-Z]{3}$/.test(currency)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid currency format');
        }

        try {
            const stripe = getStripe();

            // Check if customer exists or create new one
            let customer: Stripe.Customer;
            const existingCustomers = await stripe.customers.list({
                email: customerEmail,
                limit: 1,
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: customerEmail,
                    name: customerName,
                    metadata: {
                        userId,
                        storeId: storeId || '',
                    },
                });
            }

            // Create Payment Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount, // amount in cents
                currency: currency.toLowerCase(),
                customer: customer.id,
                metadata: {
                    userId,
                    storeId: storeId || '',
                    orderId,
                    ...metadata,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
                receipt_email: customerEmail,
            });

            // Update order with payment intent ID
            const ordersPath = storeId
                ? `users/${userId}/stores/${storeId}/orders`
                : `users/${userId}/orders`;

            await db.doc(`${ordersPath}/${orderId}`).update({
                paymentIntentId: paymentIntent.id,
                paymentStatus: 'pending',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
            };
        } catch (error: any) {
            console.error('Error creating payment intent:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create payment intent'
            );
        }
    }
);

// ============================================================================
// CREATE CHECKOUT SESSION (Alternative to Payment Intent)
// ============================================================================

/**
 * Creates a Stripe Checkout Session for more complex checkout flows
 * SECURITY: Authentication required, input validation enforced
 */
export const createCheckoutSession = functions.https.onCall(
    async (data: CreateOrderRequest & { successUrl: string; cancelUrl: string }, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // SECURITY: Sanitize inputs
        const userId = sanitizeString(data.userId, 128);
        const storeId = data.storeId ? sanitizeString(data.storeId, 100) : undefined;
        const items = Array.isArray(data.items) ? data.items.slice(0, 100) : []; // Max 100 items
        const customerEmail = sanitizeString(data.customerEmail, 254);
        const shippingCost = typeof data.shippingCost === 'number' ? Math.max(0, data.shippingCost) : 0;
        const discountCode = sanitizeString(data.discountCode, 50);
        const successUrl = sanitizeString(data.successUrl, 500);
        const cancelUrl = sanitizeString(data.cancelUrl, 500);

        // SECURITY: Validate required fields
        if (!userId || items.length === 0 || !customerEmail) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields'
            );
        }

        // SECURITY: Verify user matches
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
        }

        // SECURITY: Validate email
        if (!isValidEmail(customerEmail)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }

        // SECURITY: Validate URLs (must be HTTPS in production)
        const urlPattern = /^https?:\/\//;
        if (!urlPattern.test(successUrl) || !urlPattern.test(cancelUrl)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid URL format');
        }

        // SECURITY: Validate items
        for (const item of items) {
            if (!item.productId || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid item format');
            }
            if (item.quantity <= 0 || item.quantity > 1000) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid item quantity');
            }
            if (item.price < 0 || item.price > 1000000) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid item price');
            }
        }

        try {
            const stripe = getStripe();

            // Build line items
            const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.productName,
                        description: item.variantName || undefined,
                    },
                    unit_amount: Math.round(item.price * 100), // Convert to cents
                },
                quantity: item.quantity,
            }));

            // Add shipping as a line item if applicable
            if (shippingCost > 0) {
                lineItems.push({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Shipping',
                        },
                        unit_amount: Math.round(shippingCost * 100),
                    },
                    quantity: 1,
                });
            }

            // Create session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                customer_email: customerEmail,
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    userId,
                    storeId: storeId || '',
                    discountCode: discountCode || '',
                },
                // Apply tax automatically if configured
                automatic_tax: {
                    enabled: false, // Enable when Stripe Tax is configured
                },
            });

            return {
                sessionId: session.id,
                url: session.url,
            };
        } catch (error: any) {
            console.error('Error creating checkout session:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create checkout session'
            );
        }
    }
);

// ============================================================================
// STRIPE WEBHOOK HANDLER
// ============================================================================

/**
 * Handles Stripe webhook events
 * Must be deployed as an HTTP function (not callable)
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const webhookSecret = STRIPE_CONFIG.webhookSecret;

    console.log('[Stripe Webhook] Secret configured:', webhookSecret ? `${webhookSecret.substring(0, 10)}...` : 'NOT SET');
    console.log('[Stripe Webhook] Raw body available:', !!req.rawBody);
    console.log('[Stripe Webhook] Raw body length:', req.rawBody?.length || 0);

    if (!webhookSecret) {
        console.error('Stripe webhook secret not configured');
        res.status(500).send('Webhook secret not configured');
        return;
    }

    const signature = req.headers['stripe-signature'] as string;
    console.log('[Stripe Webhook] Signature:', signature ? `${signature.substring(0, 30)}...` : 'NOT SET');

    if (!signature) {
        res.status(400).send('Missing stripe-signature header');
        return;
    }

    let event: Stripe.Event;

    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            signature,
            webhookSecret
        );
        console.log('[Stripe Webhook] Event verified successfully:', event.type);
    } catch (error: any) {
        console.error('Webhook signature verification failed:', error.message);
        console.error('[Stripe Webhook] Debug - Secret first 15 chars:', webhookSecret.substring(0, 15));
        res.status(400).send(`Webhook Error: ${error.message}`);
        return;
    }

    // Handle the event
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

            case 'charge.dispute.created':
                await handleDisputeCreated(event.data.object as Stripe.Dispute);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Error handling webhook event:', error);
        res.status(500).send(`Webhook handler error: ${error.message}`);
    }
});

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

/**
 * Handles successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { userId, storeId, orderId } = paymentIntent.metadata;

    if (!userId || !orderId) {
        console.error('Missing metadata in payment intent:', paymentIntent.id);
        return;
    }

    const ordersPath = storeId
        ? `users/${userId}/stores/${storeId}/orders`
        : `users/${userId}/orders`;

    const orderRef = db.doc(`${ordersPath}/${orderId}`);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
        console.error('Order not found:', orderId);
        return;
    }

    // Update order status
    await orderRef.update({
        status: 'paid',
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update customer stats
    const orderData = orderDoc.data();
    if (orderData?.customerId) {
        const customersPath = storeId
            ? `users/${userId}/stores/${storeId}/customers`
            : `users/${userId}/customers`;

        await db.doc(`${customersPath}/${orderData.customerId}`).update({
            totalOrders: admin.firestore.FieldValue.increment(1),
            totalSpent: admin.firestore.FieldValue.increment(orderData.total || 0),
            lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // Update product inventory
    if (orderData?.items) {
        const productsPath = storeId
            ? `users/${userId}/stores/${storeId}/products`
            : `users/${userId}/products`;

        const batch = db.batch();

        for (const item of orderData.items) {
            const productRef = db.doc(`${productsPath}/${item.productId}`);
            batch.update(productRef, {
                quantity: admin.firestore.FieldValue.increment(-item.quantity),
            });
        }

        await batch.commit();
    }

    console.log('Payment succeeded for order:', orderId);
}

/**
 * Handles failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { userId, storeId, orderId } = paymentIntent.metadata;

    if (!userId || !orderId) {
        console.error('Missing metadata in payment intent:', paymentIntent.id);
        return;
    }

    const ordersPath = storeId
        ? `users/${userId}/stores/${storeId}/orders`
        : `users/${userId}/orders`;

    await db.doc(`${ordersPath}/${orderId}`).update({
        paymentStatus: 'failed',
        paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Payment failed for order:', orderId);
}

/**
 * Handles completed checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    const { userId, type, tenantId, planId } = metadata;

    // Handle subscription checkout completion
    if (session.mode === 'subscription' && tenantId && planId) {
        console.log(`[Stripe Webhook] Subscription checkout completed for tenant: ${tenantId}, plan: ${planId}`);

        await updateTenantSubscription(tenantId, planId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: 'active',
        });

        return;
    }

    if (!userId) {
        console.error('Missing userId in checkout session metadata');
        return;
    }

    // Handle domain purchases
    if (type === 'domain_purchase') {
        const { domainName, years, orderId } = metadata;

        if (!domainName || !orderId) {
            console.error('Missing domain metadata in checkout session');
            return;
        }

        console.log(`[Stripe Webhook] Domain payment completed: ${domainName} for user ${userId}`);

        // Import and call the domain registration function
        const { registerDomainAfterPayment } = await import('./domains/nameComApi');

        const result = await registerDomainAfterPayment(
            orderId,
            domainName,
            parseInt(years || '1', 10),
            userId
        );

        if (!result.success) {
            console.error(`[Stripe Webhook] Domain registration failed: ${result.error}`);
            // The order will be marked as failed in registerDomainAfterPayment
            // Could send notification to admin here
        }

        return;
    }

    // Handle regular e-commerce checkout
    console.log('Checkout session completed for user:', userId);
}

/**
 * Handles subscription created or updated events
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const { tenantId, planId } = subscription.metadata || {};

    if (!tenantId) {
        console.log('[Stripe Webhook] No tenantId in subscription metadata, skipping');
        return;
    }

    const status = subscription.status === 'active' || subscription.status === 'trialing'
        ? 'active'
        : subscription.status;

    console.log(`[Stripe Webhook] Subscription ${subscription.id} changed for tenant: ${tenantId}, status: ${status}`);

    await updateTenantSubscription(tenantId, planId || 'free', {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
}

/**
 * Handles subscription deleted (cancelled) events
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const { tenantId } = subscription.metadata || {};

    if (!tenantId) {
        console.log('[Stripe Webhook] No tenantId in subscription metadata, skipping');
        return;
    }

    console.log(`[Stripe Webhook] Subscription ${subscription.id} deleted for tenant: ${tenantId}`);

    // Downgrade to free plan
    await updateTenantSubscription(tenantId, 'free', {
        status: 'cancelled',
        stripeSubscriptionId: null,
        cancelledAt: new Date(),
    });
}

/**
 * Handles successful invoice payment (recurring billing)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
    // Only process subscription invoices
    if (!invoice.subscription) {
        console.log('[Stripe Webhook] Invoice not related to subscription, skipping');
        return;
    }

    const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;

    console.log(`[Stripe Webhook] Invoice paid for subscription: ${subscriptionId}`);

    // Get the subscription to find tenant
    try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const { tenantId, planId } = subscription.metadata || {};

        if (!tenantId) {
            console.log('[Stripe Webhook] No tenantId in subscription metadata');
            return;
        }

        // Update subscription period dates
        await db.doc(`subscriptions/${tenantId}`).update({
            status: 'active',
            currentPeriodStart: admin.firestore.Timestamp.fromDate(
                new Date(subscription.current_period_start * 1000)
            ),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(
                new Date(subscription.current_period_end * 1000)
            ),
            lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
            lastInvoiceId: invoice.id,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Reset AI credits for new billing period
        if (planId) {
            await updateAiCreditsForPlan(tenantId, planId);
        }

        console.log(`[Stripe Webhook] Updated subscription for tenant ${tenantId} after invoice payment`);
    } catch (error) {
        console.error('[Stripe Webhook] Error handling invoice.paid:', error);
    }
}

/**
 * Handles failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) {
        return;
    }

    const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription.id;

    console.log(`[Stripe Webhook] Invoice payment FAILED for subscription: ${subscriptionId}`);

    try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const { tenantId } = subscription.metadata || {};

        if (!tenantId) {
            return;
        }

        // Update subscription status to past_due
        await db.doc(`subscriptions/${tenantId}`).update({
            status: 'past_due',
            paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send payment failed notification email
        await sendPaymentFailedEmail(tenantId, invoice);

        console.log(`[Stripe Webhook] Marked subscription as past_due for tenant ${tenantId}`);
    } catch (error) {
        console.error('[Stripe Webhook] Error handling invoice.payment_failed:', error);
    }
}

/**
 * Sends payment failed notification email
 */
async function sendPaymentFailedEmail(tenantId: string, invoice: Stripe.Invoice) {
    try {
        const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
        if (!tenantDoc.exists) return;

        const tenantData = tenantDoc.data();
        const ownerId = tenantData?.ownerId || tenantData?.ownerUserId;

        if (!ownerId) return;

        const userDoc = await db.doc(`users/${ownerId}`).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const userEmail = userData?.email;

        if (!userEmail) return;

        const { sendEmail } = await import('./email/emailService');

        await sendEmail({
            to: userEmail,
            subject: '⚠️ Tu pago ha fallado - Acción requerida',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">Tu pago no pudo ser procesado</h2>
                    <p>Hola ${userData?.displayName || 'Usuario'},</p>
                    <p>No pudimos procesar tu pago de <strong>$${((invoice.amount_due || 0) / 100).toFixed(2)}</strong> para tu suscripción de Quimera.ai.</p>
                    <p>Por favor actualiza tu método de pago para evitar la interrupción del servicio:</p>
                    <a href="https://quimera.ai/settings/subscription" 
                       style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
                        Actualizar Método de Pago
                    </a>
                    <p style="color: #666; font-size: 14px;">Si tienes preguntas, contáctanos en soporte@quimera.ai</p>
                </div>
            `,
            from: 'Quimera AI <noreply@quimera.ai>',
        });

        console.log(`[Stripe Webhook] Sent payment failed email to ${userEmail}`);
    } catch (error) {
        console.error('[Stripe Webhook] Error sending payment failed email:', error);
    }
}

/**
 * Updates tenant subscription in Firestore
 */
async function updateTenantSubscription(
    tenantId: string,
    planId: string,
    updates: {
        stripeCustomerId?: string;
        stripeSubscriptionId?: string | null;
        status?: string;
        currentPeriodStart?: Date;
        currentPeriodEnd?: Date;
        cancelAtPeriodEnd?: boolean;
        cancelledAt?: Date;
    }
) {
    try {
        const subscriptionRef = db.doc(`subscriptions/${tenantId}`);
        const subscriptionDoc = await subscriptionRef.get();
        const previousPlanId = subscriptionDoc.exists ? subscriptionDoc.data()?.planId : 'free';

        const now = admin.firestore.FieldValue.serverTimestamp();

        if (subscriptionDoc.exists) {
            // Update existing subscription
            await subscriptionRef.update({
                planId,
                ...updates,
                currentPeriodStart: updates.currentPeriodStart
                    ? admin.firestore.Timestamp.fromDate(updates.currentPeriodStart)
                    : undefined,
                currentPeriodEnd: updates.currentPeriodEnd
                    ? admin.firestore.Timestamp.fromDate(updates.currentPeriodEnd)
                    : undefined,
                cancelledAt: updates.cancelledAt
                    ? admin.firestore.Timestamp.fromDate(updates.cancelledAt)
                    : undefined,
                lastUpdated: now,
            });
        } else {
            // Create new subscription document
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await subscriptionRef.set({
                tenantId,
                planId,
                billingCycle: 'monthly',
                status: updates.status || 'active',
                stripeCustomerId: updates.stripeCustomerId,
                stripeSubscriptionId: updates.stripeSubscriptionId,
                startDate: now,
                currentPeriodStart: updates.currentPeriodStart
                    ? admin.firestore.Timestamp.fromDate(updates.currentPeriodStart)
                    : now,
                currentPeriodEnd: updates.currentPeriodEnd
                    ? admin.firestore.Timestamp.fromDate(updates.currentPeriodEnd)
                    : admin.firestore.Timestamp.fromDate(periodEnd),
                cancelAtPeriodEnd: updates.cancelAtPeriodEnd || false,
                addOns: [],
                creditPackagesPurchased: [],
                createdAt: now,
                lastUpdated: now,
            });
        }

        // Also update the AI credits usage based on the new plan
        await updateAiCreditsForPlan(tenantId, planId);

        // Send upgrade confirmation email if plan changed to a paid plan
        if (planId !== 'free' && planId !== previousPlanId && updates.status === 'active') {
            await sendSubscriptionUpgradeEmail(tenantId, planId);
        }

        console.log(`[Stripe Webhook] Updated subscription for tenant ${tenantId} to plan ${planId}`);
    } catch (error) {
        console.error(`[Stripe Webhook] Error updating subscription for tenant ${tenantId}:`, error);
        throw error;
    }
}

/**
 * Sends subscription upgrade confirmation email
 */
async function sendSubscriptionUpgradeEmail(tenantId: string, planId: string) {
    try {
        // Get tenant info to find owner email
        const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
        if (!tenantDoc.exists) {
            console.error(`[Stripe Webhook] Tenant ${tenantId} not found for email`);
            return;
        }

        const tenantData = tenantDoc.data();
        // Support both field names for backwards compatibility
        const ownerId = tenantData?.ownerId || tenantData?.ownerUserId;

        if (!ownerId) {
            console.error(`[Stripe Webhook] No owner ID for tenant ${tenantId}`);
            return;
        }

        // Get user info
        const userDoc = await db.doc(`users/${ownerId}`).get();
        if (!userDoc.exists) {
            console.error(`[Stripe Webhook] User ${ownerId} not found for email`);
            return;
        }

        const userData = userDoc.data();
        const userEmail = userData?.email;
        const userName = userData?.displayName || userEmail?.split('@')[0] || 'Usuario';

        if (!userEmail) {
            console.error(`[Stripe Webhook] No email for user ${ownerId}`);
            return;
        }

        // Import email service and template
        const { sendEmail } = await import('./email/emailService');
        const {
            getSubscriptionUpgradeTemplate,
            getPlanFeatures,
            getPlanPrice,
            getPlanCredits
        } = await import('./email/templates/subscriptionUpgrade');

        // Get plan details
        const planNames: Record<string, string> = {
            starter: 'Starter',
            pro: 'Pro',
            agency: 'Agency',
            enterprise: 'Enterprise',
        };

        const emailHtml = getSubscriptionUpgradeTemplate({
            userName,
            userEmail,
            planName: planNames[planId] || 'Premium',
            planPrice: getPlanPrice(planId, 'monthly'),
            billingCycle: 'monthly',
            aiCredits: getPlanCredits(planId),
            features: getPlanFeatures(planId),
            dashboardUrl: 'https://quimera.ai/dashboard',
            supportEmail: 'soporte@quimera.ai',
        });

        const result = await sendEmail({
            to: userEmail,
            subject: `🎉 ¡Bienvenido al Plan ${planNames[planId] || 'Premium'}! Tu suscripción está activa`,
            html: emailHtml,
            from: 'Quimera AI <noreply@quimera.ai>',
            tags: [
                { name: 'type', value: 'subscription-upgrade' },
                { name: 'plan', value: planId },
                { name: 'tenant', value: tenantId },
            ],
        });

        if (result.success) {
            console.log(`[Stripe Webhook] Subscription upgrade email sent to ${userEmail}`);

            // Log the email
            await db.collection('emailLogs').add({
                type: 'subscription-upgrade',
                templateId: 'subscription-upgrade',
                tenantId,
                userId: ownerId,
                recipientEmail: userEmail,
                subject: `¡Bienvenido al Plan ${planNames[planId]}!`,
                status: 'sent',
                providerMessageId: result.messageId,
                provider: 'resend',
                planId,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            console.error(`[Stripe Webhook] Failed to send upgrade email: ${result.error}`);
        }
    } catch (error) {
        console.error(`[Stripe Webhook] Error sending subscription upgrade email:`, error);
        // Don't throw - email failure shouldn't fail the subscription update
    }
}

/**
 * Updates AI credits for a tenant based on their plan
 */
async function updateAiCreditsForPlan(tenantId: string, planId: string) {
    // Define credits per plan (must match types/subscription.ts SUBSCRIPTION_PLANS.limits.maxAiCredits)
    const PLAN_CREDITS: Record<string, number> = {
        free: 60,
        individual: 500,
        agency_starter: 2000,
        agency_pro: 5000,
        agency_scale: 15000,
        enterprise: 25000,
    };

    const credits = PLAN_CREDITS[planId] || PLAN_CREDITS.free;

    try {
        const creditsRef = db.doc(`aiCreditsUsage/${tenantId}`);
        const creditsDoc = await creditsRef.get();
        const now = admin.firestore.FieldValue.serverTimestamp();

        // Standardized field names (supporting both for backwards compatibility)
        const updateData = {
            tenantId,
            planId,
            // Primary field names (standard)
            limit: credits,
            used: 0,
            // Legacy field names (for backwards compatibility with frontend)
            creditsIncluded: credits,
            creditsUsed: 0,
            creditsRemaining: credits,
            // Timestamps
            lastResetAt: now,
            updatedAt: now,
        };

        if (creditsDoc.exists) {
            // Update existing credits - reset to new plan limit
            await creditsRef.update(updateData);
        } else {
            // Create new credits document
            await creditsRef.set({
                ...updateData,
                createdAt: now,
            });
        }

        console.log(`[Stripe Webhook] Updated AI credits for tenant ${tenantId}: ${credits} credits (plan: ${planId})`);
    } catch (error) {
        console.error(`[Stripe Webhook] Error updating AI credits for tenant ${tenantId}:`, error);
    }
}

/**
 * Handles refunded charges
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
    // Get the payment intent to find the order
    if (!charge.payment_intent) {
        console.log('No payment intent associated with refunded charge');
        return;
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
    const { userId, storeId, orderId } = paymentIntent.metadata;

    if (!userId || !orderId) {
        console.error('Missing metadata in payment intent');
        return;
    }

    const ordersPath = storeId
        ? `users/${userId}/stores/${storeId}/orders`
        : `users/${userId}/orders`;

    await db.doc(`${ordersPath}/${orderId}`).update({
        status: 'refunded',
        paymentStatus: 'refunded',
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundAmount: charge.amount_refunded / 100, // Convert from cents
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Charge refunded for order:', orderId);
}

/**
 * Handles dispute creation
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;

    if (!chargeId) {
        console.error('No charge associated with dispute');
        return;
    }

    const stripe = getStripe();
    const charge = await stripe.charges.retrieve(chargeId);

    if (!charge.payment_intent) {
        console.log('No payment intent associated with disputed charge');
        return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
    const { userId, storeId, orderId } = paymentIntent.metadata;

    if (!userId || !orderId) {
        console.error('Missing metadata in payment intent');
        return;
    }

    const ordersPath = storeId
        ? `users/${userId}/stores/${storeId}/orders`
        : `users/${userId}/orders`;

    await db.doc(`${ordersPath}/${orderId}`).update({
        hasDispute: true,
        disputeId: dispute.id,
        disputeReason: dispute.reason,
        disputeStatus: dispute.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Dispute created for order:', orderId);
}

// ============================================================================
// REFUND PAYMENT
// ============================================================================

/**
 * Creates a refund for an order
 */
export const createRefund = functions.https.onCall(
    async (data: { userId: string; storeId?: string; orderId: string; amount?: number; reason?: string }, context) => {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { userId, storeId, orderId, amount, reason } = data;

        if (!userId || !orderId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }

        // Verify the authenticated user owns this order
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized to refund this order');
        }

        try {
            // Get the order
            const ordersPath = storeId
                ? `users/${userId}/stores/${storeId}/orders`
                : `users/${userId}/orders`;

            const orderDoc = await db.doc(`${ordersPath}/${orderId}`).get();

            if (!orderDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Order not found');
            }

            const orderData = orderDoc.data();
            const paymentIntentId = orderData?.paymentIntentId;

            if (!paymentIntentId) {
                throw new functions.https.HttpsError('failed-precondition', 'Order has no payment intent');
            }

            const stripe = getStripe();

            // Create refund
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
                reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
            });

            // Update order status
            await db.doc(`${ordersPath}/${orderId}`).update({
                status: amount && amount < orderData.total ? 'partially_refunded' : 'refunded',
                paymentStatus: amount && amount < orderData.total ? 'partially_refunded' : 'refunded',
                refundId: refund.id,
                refundAmount: (refund.amount || 0) / 100,
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                refundId: refund.id,
                amount: (refund.amount || 0) / 100,
                status: refund.status,
            };
        } catch (error: any) {
            console.error('Error creating refund:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create refund'
            );
        }
    }
);

// ============================================================================
// GET PAYMENT STATUS
// ============================================================================

/**
 * Gets the status of a payment intent
 * SECURITY: Authentication required
 */
export const getPaymentStatus = functions.https.onCall(
    async (data: { paymentIntentId: string }, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const paymentIntentId = sanitizeString(data.paymentIntentId, 100);

        if (!paymentIntentId) {
            throw new functions.https.HttpsError('invalid-argument', 'Payment intent ID is required');
        }

        // SECURITY: Validate payment intent ID format
        if (!/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid payment intent ID format');
        }

        try {
            const stripe = getStripe();
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            // SECURITY: Verify the user owns this payment
            if (paymentIntent.metadata?.userId !== context.auth.uid) {
                throw new functions.https.HttpsError('permission-denied', 'Not authorized to view this payment');
            }

            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                created: paymentIntent.created,
            };
        } catch (error: any) {
            console.error('Error getting payment status:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to get payment status'
            );
        }
    }
);



