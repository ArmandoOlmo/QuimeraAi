/**
 * Stripe API Cloud Functions
 * Handles payment processing for the ecommerce module
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
    if (!secretKey) {
        throw new Error('Stripe secret key not configured');
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

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

    if (!webhookSecret) {
        console.error('Stripe webhook secret not configured');
        res.status(500).send('Webhook secret not configured');
        return;
    }

    const signature = req.headers['stripe-signature'] as string;

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
    } catch (error: any) {
        console.error('Webhook signature verification failed:', error.message);
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
    const { userId, type } = metadata;

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



