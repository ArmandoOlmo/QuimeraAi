/**
 * Stripe Connect Cloud Functions
 * Handles multi-tenant Stripe Connect for ecommerce stores
 * 
 * This allows each tenant to:
 * - Connect their own Stripe account
 * - Receive payments directly
 * - Quimera can optionally take a platform fee
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from './config';

// Initialize Stripe with centralized config
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

// Platform fee percentage (optional - set to 0 to disable)
const PLATFORM_FEE_PERCENT = 0; // 2.5% platform fee, change as needed

// ============================================================================
// TYPES
// ============================================================================

interface CreateConnectAccountRequest {
    userId: string;
    storeId: string;
    email: string;
    businessName: string;
    country?: string;
}

interface CreateOnboardingLinkRequest {
    userId: string;
    storeId: string;
    returnUrl: string;
    refreshUrl: string;
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================

/**
 * SECURITY: Validate email format
 */
function isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * SECURITY: Sanitize string input
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

// ============================================================================
// CREATE CONNECT ACCOUNT
// ============================================================================

/**
 * Creates a Stripe Connect Express account for a tenant
 * This is the first step - creates the account in Stripe
 */
export const createConnectAccount = functions.https.onCall(
    async (data: CreateConnectAccountRequest, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // SECURITY: Sanitize inputs
        const userId = sanitizeString(data.userId, 128);
        const storeId = sanitizeString(data.storeId, 100);
        const email = sanitizeString(data.email, 254);
        const businessName = sanitizeString(data.businessName, 200);
        const country = sanitizeString(data.country || 'US', 2);

        // SECURITY: Validate required fields
        if (!userId || !storeId || !email || !businessName) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields: userId, storeId, email, businessName'
            );
        }

        // SECURITY: Verify the authenticated user matches
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'User ID mismatch - you can only create accounts for yourself'
            );
        }

        // SECURITY: Validate formats
        if (!isValidId(userId) || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid ID format');
        }

        if (!isValidEmail(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }

        try {
            const stripe = getStripe();

            // Check if account already exists for this store
            const settingsPath = `users/${userId}/stores/${storeId}/settings/store`;
            const settingsDoc = await db.doc(settingsPath).get();
            const existingAccountId = settingsDoc.data()?.stripeConnectAccountId;

            if (existingAccountId) {
                // Return existing account
                const existingAccount = await stripe.accounts.retrieve(existingAccountId);
                return {
                    accountId: existingAccount.id,
                    alreadyExists: true,
                    chargesEnabled: existingAccount.charges_enabled,
                    payoutsEnabled: existingAccount.payouts_enabled,
                    detailsSubmitted: existingAccount.details_submitted,
                };
            }

            // Create new Express account
            const account = await stripe.accounts.create({
                type: 'express',
                country: country.toUpperCase(),
                email: email,
                business_type: 'individual', // Can be 'company' for businesses
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_profile: {
                    name: businessName,
                    product_description: `Tienda de ecommerce - ${businessName}`,
                },
                metadata: {
                    userId,
                    storeId,
                    platform: 'quimera',
                },
            });

            // Save account ID to store settings
            await db.doc(settingsPath).set({
                stripeConnectAccountId: account.id,
                stripeConnectStatus: 'pending',
                stripeConnectCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            console.log(`Created Stripe Connect account ${account.id} for store ${storeId}`);

            return {
                accountId: account.id,
                alreadyExists: false,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
            };
        } catch (error: any) {
            console.error('Error creating Connect account:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create Connect account'
            );
        }
    }
);

// ============================================================================
// CREATE ONBOARDING LINK
// ============================================================================

/**
 * Creates an onboarding link for Express account
 * This redirects the user to Stripe's hosted onboarding flow
 */
export const createConnectOnboardingLink = functions.https.onCall(
    async (data: CreateOnboardingLinkRequest, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // SECURITY: Sanitize inputs
        const userId = sanitizeString(data.userId, 128);
        const storeId = sanitizeString(data.storeId, 100);
        const returnUrl = sanitizeString(data.returnUrl, 500);
        const refreshUrl = sanitizeString(data.refreshUrl, 500);

        // SECURITY: Validate required fields
        if (!userId || !storeId || !returnUrl || !refreshUrl) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields'
            );
        }

        // SECURITY: Verify the authenticated user matches
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
        }

        // SECURITY: Validate URLs
        const urlPattern = /^https?:\/\//;
        if (!urlPattern.test(returnUrl) || !urlPattern.test(refreshUrl)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid URL format');
        }

        try {
            const stripe = getStripe();

            // Get the Connect account ID from store settings
            const settingsPath = `users/${userId}/stores/${storeId}/settings/store`;
            const settingsDoc = await db.doc(settingsPath).get();
            const accountId = settingsDoc.data()?.stripeConnectAccountId;

            if (!accountId) {
                throw new functions.https.HttpsError(
                    'not-found',
                    'No Stripe Connect account found. Please create one first.'
                );
            }

            // Create account link for onboarding
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            return {
                url: accountLink.url,
                expiresAt: accountLink.expires_at,
            };
        } catch (error: any) {
            console.error('Error creating onboarding link:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create onboarding link'
            );
        }
    }
);

// ============================================================================
// CREATE LOGIN LINK (Dashboard Access)
// ============================================================================

/**
 * Creates a login link for the Express dashboard
 * Allows tenants to view their Stripe dashboard
 */
export const createConnectLoginLink = functions.https.onCall(
    async (data: { userId: string; storeId: string }, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = sanitizeString(data.userId, 128);
        const storeId = sanitizeString(data.storeId, 100);

        // SECURITY: Verify the authenticated user matches
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
        }

        try {
            const stripe = getStripe();

            // Get the Connect account ID
            const settingsPath = `users/${userId}/stores/${storeId}/settings/store`;
            const settingsDoc = await db.doc(settingsPath).get();
            const accountId = settingsDoc.data()?.stripeConnectAccountId;

            if (!accountId) {
                throw new functions.https.HttpsError('not-found', 'No Stripe Connect account found');
            }

            // Create login link
            const loginLink = await stripe.accounts.createLoginLink(accountId);

            return {
                url: loginLink.url,
            };
        } catch (error: any) {
            console.error('Error creating login link:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create login link'
            );
        }
    }
);

// ============================================================================
// GET CONNECT ACCOUNT STATUS
// ============================================================================

/**
 * Gets the current status of a Connect account
 */
export const getConnectAccountStatus = functions.https.onCall(
    async (data: { userId: string; storeId: string }, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = sanitizeString(data.userId, 128);
        const storeId = sanitizeString(data.storeId, 100);

        // SECURITY: Verify the authenticated user matches
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
        }

        try {
            const stripe = getStripe();

            // Get the Connect account ID
            const settingsPath = `users/${userId}/stores/${storeId}/settings/store`;
            const settingsDoc = await db.doc(settingsPath).get();
            const accountId = settingsDoc.data()?.stripeConnectAccountId;

            if (!accountId) {
                return {
                    connected: false,
                    accountId: null,
                };
            }

            // Get account details
            const account = await stripe.accounts.retrieve(accountId);

            // Update status in Firestore
            let status: 'pending' | 'active' | 'restricted' = 'pending';
            if (account.charges_enabled && account.payouts_enabled) {
                status = 'active';
            } else if (account.details_submitted) {
                status = 'restricted';
            }

            await db.doc(settingsPath).update({
                stripeConnectStatus: status,
                stripeConnectChargesEnabled: account.charges_enabled,
                stripeConnectPayoutsEnabled: account.payouts_enabled,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                connected: true,
                accountId: account.id,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
                status,
                requirements: {
                    currentlyDue: account.requirements?.currently_due || [],
                    eventuallyDue: account.requirements?.eventually_due || [],
                    pastDue: account.requirements?.past_due || [],
                    disabledReason: account.requirements?.disabled_reason,
                },
                capabilities: {
                    cardPayments: account.capabilities?.card_payments,
                    transfers: account.capabilities?.transfers,
                },
            };
        } catch (error: any) {
            console.error('Error getting account status:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to get account status'
            );
        }
    }
);

// ============================================================================
// CREATE PAYMENT INTENT WITH CONNECT (Destination Charge)
// ============================================================================

/**
 * Creates a Payment Intent that sends funds to a connected account
 * This is used when a customer makes a purchase in a tenant's store
 */
export const createConnectPaymentIntent = functions.https.onCall(
    async (data: {
        userId: string;       // Store owner's userId
        storeId: string;
        orderId: string;
        amount: number;       // in cents
        currency: string;
        customerEmail: string;
        customerName: string;
        metadata?: Record<string, string>;
    }, context) => {
        // SECURITY: Require authentication (this is the customer, not the store owner)
        // For guest checkout, you might want to modify this
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // SECURITY: Sanitize inputs
        const storeOwnerId = sanitizeString(data.userId, 128);
        const storeId = sanitizeString(data.storeId, 100);
        const orderId = sanitizeString(data.orderId, 100);
        const amount = typeof data.amount === 'number' ? data.amount : 0;
        const currency = sanitizeString(data.currency, 10);
        const customerEmail = sanitizeString(data.customerEmail, 254);
        const customerName = sanitizeString(data.customerName, 200);

        // SECURITY: Validate required fields
        if (!storeOwnerId || !storeId || !orderId || !amount || !currency || !customerEmail) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required fields'
            );
        }

        // SECURITY: Validate amount
        if (amount <= 0 || amount > 100000000) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid amount');
        }

        try {
            const stripe = getStripe();

            // Get the store's Connect account ID
            const settingsPath = `users/${storeOwnerId}/stores/${storeId}/settings/store`;
            const settingsDoc = await db.doc(settingsPath).get();
            const settingsData = settingsDoc.data();
            const connectedAccountId = settingsData?.stripeConnectAccountId;

            if (!connectedAccountId) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'Store has not connected their Stripe account'
                );
            }

            // Verify the connected account can accept payments
            const connectedAccount = await stripe.accounts.retrieve(connectedAccountId);
            if (!connectedAccount.charges_enabled) {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'Store\'s Stripe account is not fully activated'
                );
            }

            // Calculate platform fee (optional)
            const platformFee = PLATFORM_FEE_PERCENT > 0 
                ? Math.round(amount * (PLATFORM_FEE_PERCENT / 100))
                : 0;

            // Create or get customer on the platform account
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
                });
            }

            // Create Payment Intent with destination charge
            const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
                amount,
                currency: currency.toLowerCase(),
                customer: customer.id,
                metadata: {
                    storeOwnerId,
                    storeId,
                    orderId,
                    customerId: context.auth.uid,
                    ...data.metadata,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
                receipt_email: customerEmail,
                // Send funds to the connected account
                transfer_data: {
                    destination: connectedAccountId,
                },
            };

            // Add platform fee if configured
            if (platformFee > 0) {
                paymentIntentParams.application_fee_amount = platformFee;
            }

            const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

            // Update order with payment intent ID
            const ordersPath = `users/${storeOwnerId}/stores/${storeId}/orders`;
            await db.doc(`${ordersPath}/${orderId}`).update({
                paymentIntentId: paymentIntent.id,
                paymentStatus: 'pending',
                paymentMethod: 'stripe_connect',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
                connectedAccountId,
                platformFee: platformFee / 100, // Return in dollars
            };
        } catch (error: any) {
            console.error('Error creating Connect payment intent:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create payment intent'
            );
        }
    }
);

// ============================================================================
// STRIPE CONNECT WEBHOOK HANDLER
// ============================================================================

/**
 * Handles Stripe Connect webhook events
 * Listens for account updates and payment events
 */
export const stripeConnectWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || 
                          STRIPE_CONFIG.connectWebhookSecret ||
                          STRIPE_CONFIG.webhookSecret;

    if (!webhookSecret) {
        console.error('Stripe Connect webhook secret not configured');
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
            case 'account.updated':
                await handleAccountUpdated(event.data.object as Stripe.Account);
                break;

            case 'account.application.deauthorized':
                await handleAccountDeauthorized(event.data.object as Stripe.Application);
                break;

            case 'payment_intent.succeeded':
                // Handle successful Connect payment
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                if (paymentIntent.transfer_data?.destination) {
                    await handleConnectPaymentSucceeded(paymentIntent);
                }
                break;

            case 'transfer.created':
                await handleTransferCreated(event.data.object as Stripe.Transfer);
                break;

            case 'payout.paid':
                await handlePayoutPaid(event.data.object as Stripe.Payout);
                break;

            default:
                console.log(`Unhandled Connect event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('Error handling Connect webhook event:', error);
        res.status(500).send(`Webhook handler error: ${error.message}`);
    }
});

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

/**
 * Handles account.updated events
 * Updates the store's Connect status in Firestore
 */
async function handleAccountUpdated(account: Stripe.Account) {
    const { userId, storeId } = account.metadata || {};

    if (!userId || !storeId) {
        console.log('Account updated but no metadata found:', account.id);
        return;
    }

    let status: 'pending' | 'active' | 'restricted' = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
        status = 'active';
    } else if (account.details_submitted) {
        status = 'restricted';
    }

    const settingsPath = `users/${userId}/stores/${storeId}/settings/store`;
    await db.doc(settingsPath).update({
        stripeConnectStatus: status,
        stripeConnectChargesEnabled: account.charges_enabled,
        stripeConnectPayoutsEnabled: account.payouts_enabled,
        stripeConnectDetailsSubmitted: account.details_submitted,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Updated Connect status for store ${storeId}: ${status}`);
}

/**
 * Handles account deauthorization
 * Clears Connect data when a tenant disconnects
 */
async function handleAccountDeauthorized(application: Stripe.Application) {
    // This event doesn't include the account ID directly
    // You may need to look up which store had this application
    console.log('Account deauthorized:', application.id);
}

/**
 * Handles successful Connect payments
 */
async function handleConnectPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { storeOwnerId, storeId, orderId } = paymentIntent.metadata;

    if (!storeOwnerId || !storeId || !orderId) {
        console.error('Missing metadata in Connect payment intent:', paymentIntent.id);
        return;
    }

    const ordersPath = `users/${storeOwnerId}/stores/${storeId}/orders`;
    await db.doc(`${ordersPath}/${orderId}`).update({
        status: 'paid',
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Connect payment succeeded for order:', orderId);
}

/**
 * Handles transfer creation (funds sent to connected account)
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
    console.log('Transfer created:', transfer.id, 'to', transfer.destination);
}

/**
 * Handles payout completion (funds sent to tenant's bank)
 */
async function handlePayoutPaid(payout: Stripe.Payout) {
    console.log('Payout completed:', payout.id, 'amount:', payout.amount);
}

// ============================================================================
// DISCONNECT ACCOUNT
// ============================================================================

/**
 * Disconnects a Connect account from the platform
 */
export const disconnectConnectAccount = functions.https.onCall(
    async (data: { userId: string; storeId: string }, context) => {
        // SECURITY: Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = sanitizeString(data.userId, 128);
        const storeId = sanitizeString(data.storeId, 100);

        // SECURITY: Verify the authenticated user matches
        if (context.auth.uid !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
        }

        try {
            // Clear Connect data from store settings
            const settingsPath = `users/${userId}/stores/${storeId}/settings/store`;
            await db.doc(settingsPath).update({
                stripeConnectAccountId: admin.firestore.FieldValue.delete(),
                stripeConnectStatus: admin.firestore.FieldValue.delete(),
                stripeConnectChargesEnabled: admin.firestore.FieldValue.delete(),
                stripeConnectPayoutsEnabled: admin.firestore.FieldValue.delete(),
                stripeConnectDetailsSubmitted: admin.firestore.FieldValue.delete(),
                stripeConnectCreatedAt: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true };
        } catch (error: any) {
            console.error('Error disconnecting account:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to disconnect account'
            );
        }
    }
);











