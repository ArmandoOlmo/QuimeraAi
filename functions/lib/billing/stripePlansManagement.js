"use strict";
/**
 * Stripe Plans Management
 * Cloud Functions for managing subscription plans in Stripe
 * Handles Products, Prices, and synchronization with Firestore
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
exports.createCustomerPortalSession = exports.createCheckoutSession = exports.archivePlan = exports.createOrUpdatePlan = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
// Initialize Stripe with API key from config or environment
const stripe = new stripe_1.default(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
const PLANS_COLLECTION = 'subscriptionPlans';
// =============================================================================
// CREATE OR UPDATE PLAN
// =============================================================================
/**
 * Create or update a subscription plan in Stripe
 * - Creates/updates Stripe Product
 * - Creates new Prices (Stripe prices are immutable, so we create new ones)
 * - Updates Firestore with Stripe IDs
 */
exports.createOrUpdatePlan = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { plan } = req.body;
        if (!plan || !plan.id || !plan.name) {
            res.status(400).json({ error: 'Plan id and name are required' });
            return;
        }
        let productId = plan.stripeProductId;
        let priceIdMonthly = plan.stripePriceIdMonthly;
        let priceIdAnnually = plan.stripePriceIdAnnually;
        // Build feature list for Stripe
        const features = plan.features || [];
        // =================================================================
        // PRODUCT MANAGEMENT
        // =================================================================
        if (productId) {
            // Update existing product
            console.log(`[createOrUpdatePlan] Updating Stripe product: ${productId}`);
            await stripe.products.update(productId, {
                name: plan.name,
                description: plan.description || `Plan ${plan.name} de Quimera AI`,
                active: !plan.isArchived,
                metadata: {
                    planId: plan.id,
                    isFeatured: String(plan.isFeatured || false),
                },
                // Stripe supports up to 15 features
                features: features.slice(0, 15).map(f => ({ name: f })),
            });
        }
        else {
            // Create new product
            console.log(`[createOrUpdatePlan] Creating new Stripe product for plan: ${plan.id}`);
            const product = await stripe.products.create({
                name: plan.name,
                description: plan.description || `Plan ${plan.name} de Quimera AI`,
                active: !plan.isArchived,
                metadata: {
                    planId: plan.id,
                    isFeatured: String(plan.isFeatured || false),
                },
                features: features.slice(0, 15).map(f => ({ name: f })),
            });
            productId = product.id;
            console.log(`[createOrUpdatePlan] Created Stripe product: ${productId}`);
        }
        // =================================================================
        // PRICE MANAGEMENT
        // =================================================================
        // Check if we need to create new prices (prices are immutable in Stripe)
        // We create new prices if:
        // 1. No existing price ID
        // 2. Price amount has changed (we check this by looking up existing prices)
        const needsNewMonthlyPrice = await shouldCreateNewPrice(priceIdMonthly, plan.price.monthly * 100, // Convert to cents
        'month');
        const needsNewAnnualPrice = await shouldCreateNewPrice(priceIdAnnually, plan.price.annually * 12 * 100, // Annual total in cents
        'year');
        // Create monthly price if needed and price > 0
        if (needsNewMonthlyPrice && plan.price.monthly > 0) {
            console.log(`[createOrUpdatePlan] Creating monthly price for plan: ${plan.id}`);
            // Archive old price if exists
            if (priceIdMonthly) {
                try {
                    await stripe.prices.update(priceIdMonthly, { active: false });
                }
                catch (e) {
                    console.warn(`Could not archive old monthly price: ${priceIdMonthly}`);
                }
            }
            const monthlyPrice = await stripe.prices.create({
                product: productId,
                unit_amount: Math.round(plan.price.monthly * 100),
                currency: 'usd',
                recurring: {
                    interval: 'month',
                },
                metadata: {
                    planId: plan.id,
                    billingCycle: 'monthly',
                },
            });
            priceIdMonthly = monthlyPrice.id;
            console.log(`[createOrUpdatePlan] Created monthly price: ${priceIdMonthly}`);
        }
        // Create annual price if needed and price > 0
        if (needsNewAnnualPrice && plan.price.annually > 0) {
            console.log(`[createOrUpdatePlan] Creating annual price for plan: ${plan.id}`);
            // Archive old price if exists
            if (priceIdAnnually) {
                try {
                    await stripe.prices.update(priceIdAnnually, { active: false });
                }
                catch (e) {
                    console.warn(`Could not archive old annual price: ${priceIdAnnually}`);
                }
            }
            // Annual price is the monthly price * 12, but since annually is already monthly equivalent
            // we need to calculate total annual amount
            const annualPrice = await stripe.prices.create({
                product: productId,
                unit_amount: Math.round(plan.price.annually * 12 * 100), // Total annual in cents
                currency: 'usd',
                recurring: {
                    interval: 'year',
                },
                metadata: {
                    planId: plan.id,
                    billingCycle: 'annually',
                    monthlyEquivalent: String(plan.price.annually),
                },
            });
            priceIdAnnually = annualPrice.id;
            console.log(`[createOrUpdatePlan] Created annual price: ${priceIdAnnually}`);
        }
        // =================================================================
        // UPDATE FIRESTORE
        // =================================================================
        const planRef = db.collection(PLANS_COLLECTION).doc(plan.id);
        await planRef.set({
            stripeProductId: productId,
            stripePriceIdMonthly: priceIdMonthly || null,
            stripePriceIdAnnually: priceIdAnnually || null,
            stripeLastSyncAt: firestore_1.Timestamp.now(),
        }, { merge: true });
        console.log(`[createOrUpdatePlan] Updated Firestore for plan: ${plan.id}`);
        const result = {
            success: true,
            productId,
            priceIdMonthly,
            priceIdAnnually,
        };
        res.json(result);
    }
    catch (error) {
        console.error('[createOrUpdatePlan] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al sincronizar con Stripe',
        });
    }
});
/**
 * Check if we need to create a new price
 * (Stripe prices are immutable, so we create new ones when amount changes)
 */
async function shouldCreateNewPrice(existingPriceId, expectedAmountCents, interval) {
    if (!existingPriceId) {
        return true; // No existing price, need to create
    }
    try {
        const price = await stripe.prices.retrieve(existingPriceId);
        // Check if price is active and amount matches
        if (!price.active) {
            return true; // Price is archived, need new one
        }
        if (price.unit_amount !== expectedAmountCents) {
            return true; // Amount changed, need new price
        }
        if (price.recurring?.interval !== interval) {
            return true; // Interval changed, need new price
        }
        return false; // Price is valid, no need to create new one
    }
    catch (e) {
        console.warn(`Could not retrieve price ${existingPriceId}, will create new`);
        return true;
    }
}
// =============================================================================
// ARCHIVE PLAN
// =============================================================================
/**
 * Archive a plan in Stripe (deactivate product and prices)
 */
exports.archivePlan = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { productId } = req.body;
        if (!productId) {
            res.status(400).json({ error: 'productId is required' });
            return;
        }
        console.log(`[archivePlan] Archiving Stripe product: ${productId}`);
        // Archive the product
        await stripe.products.update(productId, { active: false });
        // Archive all prices for this product
        const prices = await stripe.prices.list({ product: productId, active: true });
        for (const price of prices.data) {
            await stripe.prices.update(price.id, { active: false });
            console.log(`[archivePlan] Archived price: ${price.id}`);
        }
        console.log(`[archivePlan] Successfully archived product: ${productId}`);
        res.json({ success: true });
    }
    catch (error) {
        console.error('[archivePlan] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al archivar en Stripe',
        });
    }
});
// =============================================================================
// GET STRIPE CHECKOUT URL
// =============================================================================
/**
 * Create a Stripe Checkout session for a subscription
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { planId, billingCycle, tenantId, successUrl, cancelUrl } = data;
        // Get plan from Firestore
        const planDoc = await db.collection(PLANS_COLLECTION).doc(planId).get();
        if (!planDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Plan not found');
        }
        const planData = planDoc.data();
        const priceId = billingCycle === 'annually'
            ? planData.stripePriceIdAnnually
            : planData.stripePriceIdMonthly;
        if (!priceId) {
            throw new functions.https.HttpsError('failed-precondition', 'Plan does not have Stripe price configured');
        }
        // Get or create Stripe customer
        let customerId;
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        if (tenantData?.stripeCustomerId) {
            customerId = tenantData.stripeCustomerId;
        }
        else {
            // Get user email
            const userDoc = await db.collection('users').doc(context.auth.uid).get();
            const userData = userDoc.data();
            const customer = await stripe.customers.create({
                email: userData?.email || context.auth.token.email,
                metadata: {
                    tenantId,
                    userId: context.auth.uid,
                },
            });
            customerId = customer.id;
            // Save customer ID
            await db.collection('tenants').doc(tenantId).update({
                stripeCustomerId: customerId,
            });
        }
        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
            success_url: successUrl || `${functions.config().app?.url || 'https://app.quimera.ai'}/dashboard?subscription=success`,
            cancel_url: cancelUrl || `${functions.config().app?.url || 'https://app.quimera.ai'}/pricing?subscription=cancelled`,
            metadata: {
                tenantId,
                planId,
                billingCycle,
            },
            subscription_data: {
                metadata: {
                    tenantId,
                    planId,
                },
            },
        });
        return {
            success: true,
            sessionId: session.id,
            url: session.url,
        };
    }
    catch (error) {
        console.error('[createCheckoutSession] Error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Error creating checkout session');
    }
});
// =============================================================================
// GET CUSTOMER PORTAL URL
// =============================================================================
/**
 * Create a Stripe Customer Portal session for managing subscription
 */
exports.createCustomerPortalSession = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, returnUrl } = data;
        // Get tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant not found');
        }
        const tenantData = tenantDoc.data();
        const customerId = tenantData.stripeCustomerId;
        if (!customerId) {
            throw new functions.https.HttpsError('failed-precondition', 'No Stripe customer found for this tenant');
        }
        // Create portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${functions.config().app?.url || 'https://app.quimera.ai'}/dashboard/settings/billing`,
        });
        return {
            success: true,
            url: session.url,
        };
    }
    catch (error) {
        console.error('[createCustomerPortalSession] Error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Error creating portal session');
    }
});
//# sourceMappingURL=stripePlansManagement.js.map