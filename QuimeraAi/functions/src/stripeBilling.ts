/**
 * Stripe Billing Cloud Functions
 * Provides real billing metrics from Stripe for the Super Admin dashboard
 */

import * as functions from 'firebase-functions';
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

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface BillingMetrics {
    mrr: number;
    activeSubscriptions: number;
    arpu: number;
    churnRate: number;
    revenueTrend: { month: string; revenue: number }[];
    planDistribution: { planId: string; planName: string; subscribers: number; color: string }[];
    plans: StripePlan[];
    serviceModules: ServiceModule[];
}

interface StripePlan {
    id: string;
    name: string;
    description: string;
    price: { monthly: number; annually: number };
    features: string[];
    isFeatured: boolean;
    isArchived: boolean;
    stripeProductId?: string;
    stripePriceIdMonthly?: string;
    stripePriceIdAnnually?: string;
}

interface ServiceModule {
    id: string;
    name: string;
    description: string;
}

// Default service modules
const DEFAULT_SERVICE_MODULES: ServiceModule[] = [
    { id: 'module_builder', name: 'AI Website Builder', description: 'Core website creation and hosting.' },
    { id: 'module_analytics', name: 'Advanced Analytics', description: 'In-depth visitor analytics and reporting.' },
    { id: 'module_support', name: 'Priority Support', description: '24/7 priority email and chat support.' },
    { id: 'module_api', name: 'API Access', description: 'Programmatic access to platform features.' },
    { id: 'module_whitelabel', name: 'White-Label Portal', description: 'Custom branded client portal.' },
    { id: 'module_multitenancy', name: 'Multi-Tenancy', description: 'Manage multiple client workspaces.' },
    { id: 'module_ecommerce', name: 'E-Commerce', description: 'Full e-commerce capabilities with Stripe.' },
    { id: 'module_chat', name: 'AI Chat Widget', description: 'Embeddable chat for lead capture.' },
];

// Plan colors for charts
const PLAN_COLORS = ['#6b7280', '#4f46e5', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

/**
 * Get billing metrics from Stripe
 */
export const getBillingMetrics = functions.https.onRequest(async (req, res) => {
    // Handle CORS
    res.set(corsHeaders);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const stripe = getStripe();

        // Fetch all data in parallel
        const [
            subscriptions,
            products,
            prices,
            balanceTransactions,
        ] = await Promise.all([
            stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.items.data.price.product'] }),
            stripe.products.list({ active: true, limit: 100 }),
            stripe.prices.list({ active: true, limit: 100 }),
            stripe.balanceTransactions.list({ limit: 100, type: 'charge' }),
        ]);

        // Calculate MRR (Monthly Recurring Revenue)
        let mrr = 0;
        const planCounts: Record<string, { name: string; count: number }> = {};

        for (const sub of subscriptions.data) {
            for (const item of sub.items.data) {
                const price = item.price;
                if (price.recurring) {
                    let monthlyAmount = price.unit_amount || 0;

                    // Convert to monthly if annual
                    if (price.recurring.interval === 'year') {
                        monthlyAmount = monthlyAmount / 12;
                    } else if (price.recurring.interval === 'week') {
                        monthlyAmount = monthlyAmount * 4;
                    }

                    mrr += monthlyAmount;

                    // Count by plan
                    const productId = typeof price.product === 'string' ? price.product : (price.product as Stripe.Product)?.id || 'unknown';
                    const productObj = price.product as Stripe.Product | undefined;
                    const productName = productObj && 'name' in productObj ? productObj.name : 'Unknown Plan';

                    if (!planCounts[productId]) {
                        planCounts[productId] = { name: productName, count: 0 };
                    }
                    planCounts[productId].count++;
                }
            }
        }

        // Convert MRR from cents to dollars
        mrr = mrr / 100;

        // Active subscriptions count
        const activeSubscriptions = subscriptions.data.length;

        // ARPU (Average Revenue Per User)
        const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

        // Calculate churn rate (simplified - would need historical data for accuracy)
        // For now, return a placeholder or fetch from Stripe Billing if available
        const churnRate = 0; // Would need canceled subscriptions from last month

        // Revenue trend (last 12 months)
        const revenueTrend = await calculateRevenueTrend(stripe);

        // Plan distribution
        const planDistribution = Object.entries(planCounts).map(([planId, data], index) => ({
            planId,
            planName: data.name,
            subscribers: data.count,
            color: PLAN_COLORS[index % PLAN_COLORS.length],
        }));

        // Build plans from Stripe products/prices
        const plans = buildPlansFromStripe(products.data, prices.data);

        const metrics: BillingMetrics = {
            mrr: Math.round(mrr * 100) / 100,
            activeSubscriptions,
            arpu: Math.round(arpu * 100) / 100,
            churnRate,
            revenueTrend,
            planDistribution,
            plans,
            serviceModules: DEFAULT_SERVICE_MODULES,
        };

        res.status(200).json(metrics);

    } catch (error) {
        console.error('Error fetching billing metrics:', error);
        res.status(500).json({
            error: 'Failed to fetch billing metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Calculate revenue trend for last 12 months
 */
async function calculateRevenueTrend(stripe: Stripe): Promise<{ month: string; revenue: number }[]> {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('en-US', { month: 'short' });

        const startOfMonth = Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000);
        const endOfMonth = Math.floor(new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000);

        try {
            // Get charges for this month
            const charges = await stripe.charges.list({
                created: { gte: startOfMonth, lte: endOfMonth },
                limit: 100,
            });

            const revenue = charges.data
                .filter(c => c.status === 'succeeded')
                .reduce((sum, c) => sum + c.amount, 0) / 100;

            months.push({ month: monthName, revenue: Math.round(revenue * 100) / 100 });
        } catch {
            months.push({ month: monthName, revenue: 0 });
        }
    }

    return months;
}

/**
 * Build plans array from Stripe products and prices
 */
function buildPlansFromStripe(products: Stripe.Product[], prices: Stripe.Price[]): StripePlan[] {
    const plans: StripePlan[] = [];

    for (const product of products) {
        const productPrices = prices.filter(p => p.product === product.id);

        const monthlyPrice = productPrices.find(p => p.recurring?.interval === 'month');
        const annualPrice = productPrices.find(p => p.recurring?.interval === 'year');

        const features = product.metadata?.features?.split(',').map(f => f.trim()) || [];

        plans.push({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: {
                monthly: monthlyPrice ? (monthlyPrice.unit_amount || 0) / 100 : 0,
                annually: annualPrice ? (annualPrice.unit_amount || 0) / 100 : 0,
            },
            features,
            isFeatured: product.metadata?.featured === 'true',
            isArchived: !product.active,
            stripeProductId: product.id,
            stripePriceIdMonthly: monthlyPrice?.id,
            stripePriceIdAnnually: annualPrice?.id,
        });
    }

    // Sort by monthly price
    plans.sort((a, b) => a.price.monthly - b.price.monthly);

    return plans;
}

/**
 * Create or update a plan in Stripe
 */
export const createOrUpdatePlan = functions.https.onRequest(async (req, res) => {
    res.set(corsHeaders);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const stripe = getStripe();
        const { plan } = req.body as { plan: StripePlan };

        if (!plan || !plan.name) {
            res.status(400).json({ error: 'Plan name is required' });
            return;
        }

        let product: Stripe.Product;

        if (plan.stripeProductId) {
            // Update existing product
            product = await stripe.products.update(plan.stripeProductId, {
                name: plan.name,
                description: plan.description,
                metadata: {
                    features: plan.features.join(','),
                    featured: plan.isFeatured ? 'true' : 'false',
                },
            });
        } else {
            // Create new product
            product = await stripe.products.create({
                name: plan.name,
                description: plan.description,
                metadata: {
                    features: plan.features.join(','),
                    featured: plan.isFeatured ? 'true' : 'false',
                },
            });

            // Create monthly price if > 0
            if (plan.price.monthly > 0) {
                await stripe.prices.create({
                    product: product.id,
                    unit_amount: Math.round(plan.price.monthly * 100),
                    currency: 'usd',
                    recurring: { interval: 'month' },
                });
            }

            // Create annual price if > 0
            if (plan.price.annually > 0) {
                await stripe.prices.create({
                    product: product.id,
                    unit_amount: Math.round(plan.price.annually * 100),
                    currency: 'usd',
                    recurring: { interval: 'year' },
                });
            }
        }

        res.status(200).json({ success: true, productId: product.id });

    } catch (error) {
        console.error('Error creating/updating plan:', error);
        res.status(500).json({
            error: 'Failed to save plan',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Create a subscription checkout session
 * Used when a user wants to upgrade their plan
 */
export const createSubscriptionCheckout = functions.https.onCall(
    async (data: {
        tenantId: string;
        planId: string;
        billingCycle: 'monthly' | 'annually';
        successUrl: string;
        cancelUrl: string;
    }, context) => {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { tenantId, planId, billingCycle, successUrl, cancelUrl } = data;

        if (!tenantId || !planId || !billingCycle) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }

        try {
            const stripe = getStripe();

            // Mapeo de planId a nombres de producto en Stripe
            const PLAN_NAME_MAPPING: Record<string, string[]> = {
                'free': ['free', 'gratis'],
                'individual': ['individual', 'indie', 'personal'],
                'agency_starter': ['agency starter', 'agency-starter', 'starter'],
                'agency_pro': ['agency pro', 'agency-pro', 'pro'],
                'agency_scale': ['agency scale', 'agency-scale', 'scale'],
                'enterprise': ['enterprise', 'empresarial'],
            };

            // Get the product and price from Stripe based on plan name
            const products = await stripe.products.list({ active: true, limit: 100 });

            console.log(`[Stripe Checkout] Looking for plan: ${planId}`);
            console.log(`[Stripe Checkout] Available products:`, products.data.map(p => ({
                id: p.id,
                name: p.name,
                metadata: p.metadata
            })));

            // Try multiple matching strategies
            let product = products.data.find(p => p.metadata?.planId === planId);

            if (!product) {
                // Try exact name match
                product = products.data.find(p =>
                    p.name.toLowerCase() === planId.toLowerCase() ||
                    p.name.toLowerCase().replace(/\s+/g, '_') === planId.toLowerCase()
                );
            }

            if (!product) {
                // Try name mapping
                const possibleNames = PLAN_NAME_MAPPING[planId] || [planId];
                product = products.data.find(p =>
                    possibleNames.some(name =>
                        p.name.toLowerCase().includes(name.toLowerCase())
                    )
                );
            }

            if (!product) {
                console.error(`[Stripe Checkout] Plan ${planId} not found. Available products:`,
                    products.data.map(p => p.name));
                throw new functions.https.HttpsError(
                    'not-found',
                    `Plan "${planId}" not found in Stripe. Tip: Add planId="${planId}" to product metadata in Stripe Dashboard.`
                );
            }

            console.log(`[Stripe Checkout] Found product for plan ${planId}:`, product.name, product.id);

            // Get the price for this product
            const prices = await stripe.prices.list({
                product: product.id,
                active: true,
                limit: 10
            });

            const interval = billingCycle === 'annually' ? 'year' : 'month';
            const price = prices.data.find(p => p.recurring?.interval === interval);

            if (!price) {
                throw new functions.https.HttpsError('not-found', `Price for ${billingCycle} billing not found`);
            }

            // Check if this plan has a trial period (7 days for Individual plan only)
            const planHasTrial = ['individual'].includes(planId);
            const trialDays = planHasTrial ? 7 : undefined;

            // Create checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price: price.id,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    tenantId,
                    planId,
                    billingCycle,
                    userId: context.auth.uid,
                },
                subscription_data: {
                    metadata: {
                        tenantId,
                        planId,
                    },
                    // Add 7-day trial for eligible plans
                    ...(trialDays && { trial_period_days: trialDays }),
                },
            });

            return {
                sessionId: session.id,
                url: session.url,
            };
        } catch (error: any) {
            console.error('Error creating subscription checkout:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to create checkout session'
            );
        }
    }
);

/**
 * Update an existing subscription (upgrade/downgrade)
 * Handles proration automatically
 */
export const updateSubscription = functions.https.onCall(
    async (data: {
        tenantId: string;
        newPlanId: string;
        billingCycle?: 'monthly' | 'annually';
    }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { tenantId, newPlanId, billingCycle } = data;

        if (!tenantId || !newPlanId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }

        try {
            const stripe = getStripe();
            const admin = await import('firebase-admin');
            const db = admin.firestore();

            // Get current subscription from Firestore
            const subscriptionDoc = await db.doc(`subscriptions/${tenantId}`).get();

            if (!subscriptionDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'No subscription found for this tenant');
            }

            const currentSub = subscriptionDoc.data();
            const stripeSubscriptionId = currentSub?.stripeSubscriptionId;

            if (!stripeSubscriptionId) {
                // No Stripe subscription, create new checkout
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'No active Stripe subscription. Please use checkout to subscribe.'
                );
            }

            // Get the Stripe subscription
            const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

            if (stripeSubscription.status !== 'active' && stripeSubscription.status !== 'trialing') {
                throw new functions.https.HttpsError(
                    'failed-precondition',
                    'Subscription is not active'
                );
            }

            // Mapeo de planId a nombres de producto en Stripe
            const PLAN_NAME_MAPPING: Record<string, string[]> = {
                'free': ['free', 'gratis'],
                'individual': ['individual', 'indie', 'personal'],
                'agency_starter': ['agency starter', 'agency-starter', 'starter'],
                'agency_pro': ['agency pro', 'agency-pro', 'pro'],
                'agency_scale': ['agency scale', 'agency-scale', 'scale'],
                'enterprise': ['enterprise', 'empresarial'],
            };

            // Find the new price
            const products = await stripe.products.list({ active: true, limit: 100 });

            console.log(`[Stripe] Looking for plan: ${newPlanId}`);
            console.log(`[Stripe] Available products:`, products.data.map(p => ({
                id: p.id,
                name: p.name,
                metadata: p.metadata
            })));

            // Try multiple matching strategies
            let product = products.data.find(p => p.metadata?.planId === newPlanId);

            if (!product) {
                // Try exact name match
                product = products.data.find(p =>
                    p.name.toLowerCase() === newPlanId.toLowerCase() ||
                    p.name.toLowerCase().replace(/\s+/g, '_') === newPlanId.toLowerCase()
                );
            }

            if (!product) {
                // Try name mapping
                const possibleNames = PLAN_NAME_MAPPING[newPlanId] || [newPlanId];
                product = products.data.find(p =>
                    possibleNames.some(name =>
                        p.name.toLowerCase().includes(name.toLowerCase())
                    )
                );
            }

            if (!product) {
                console.error(`[Stripe] Plan ${newPlanId} not found. Available products:`,
                    products.data.map(p => p.name));
                throw new functions.https.HttpsError(
                    'not-found',
                    `Plan "${newPlanId}" not found in Stripe. Tip: Add planId="${newPlanId}" to product metadata in Stripe Dashboard.`
                );
            }

            console.log(`[Stripe] Found product for plan ${newPlanId}:`, product.name, product.id);

            const prices = await stripe.prices.list({
                product: product.id,
                active: true,
                limit: 10
            });

            const interval = billingCycle === 'annually' ? 'year' : 'month';
            const newPrice = prices.data.find(p => p.recurring?.interval === interval);

            if (!newPrice) {
                throw new functions.https.HttpsError('not-found', `Price for ${billingCycle || 'monthly'} billing not found`);
            }

            // Update the subscription with proration and immediate invoice
            const currentItem = stripeSubscription.items.data[0];

            const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                items: [{
                    id: currentItem.id,
                    price: newPrice.id,
                }],
                proration_behavior: 'always_invoice', // Create and charge invoice immediately
                payment_behavior: 'error_if_incomplete', // Fail if payment doesn't succeed
                metadata: {
                    tenantId,
                    planId: newPlanId,
                },
            });

            // Calculate proration amount
            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
                subscription: stripeSubscriptionId,
            });

            const prorationAmount = upcomingInvoice.lines.data
                .filter(line => line.proration)
                .reduce((sum, line) => sum + line.amount, 0) / 100;

            // Update Firestore
            const planLimits = await getPlanLimits(newPlanId);

            await db.doc(`subscriptions/${tenantId}`).update({
                planId: newPlanId,
                billingCycle: billingCycle || currentSub?.billingCycle || 'monthly',
                status: 'active',
                currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update AI credits with standardized fields
            await db.doc(`aiCreditsUsage/${tenantId}`).set({
                tenantId,
                planId: newPlanId,
                // Primary fields
                limit: planLimits.maxAiCredits,
                used: 0,
                // Legacy fields for backwards compatibility
                creditsIncluded: planLimits.maxAiCredits,
                creditsUsed: 0,
                creditsRemaining: planLimits.maxAiCredits,
                // Timestamps
                lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            console.log(`[Stripe] Subscription updated for tenant ${tenantId}: ${currentSub?.planId} -> ${newPlanId}`);

            return {
                success: true,
                subscription: {
                    id: updatedSubscription.id,
                    status: updatedSubscription.status,
                    currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
                    planId: newPlanId,
                },
                proration: {
                    amount: prorationAmount,
                    description: prorationAmount > 0
                        ? `You'll be charged $${prorationAmount.toFixed(2)} for the upgrade`
                        : prorationAmount < 0
                            ? `You'll receive a credit of $${Math.abs(prorationAmount).toFixed(2)}`
                            : 'No proration applied',
                },
            };

        } catch (error: any) {
            console.error('Error updating subscription:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to update subscription'
            );
        }
    }
);

/**
 * Cancel a subscription
 * Can cancel immediately or at period end
 */
export const cancelSubscription = functions.https.onCall(
    async (data: {
        tenantId: string;
        immediately?: boolean;
        reason?: string;
    }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { tenantId, immediately = false, reason } = data;

        if (!tenantId) {
            throw new functions.https.HttpsError('invalid-argument', 'Tenant ID is required');
        }

        try {
            const stripe = getStripe();
            const admin = await import('firebase-admin');
            const db = admin.firestore();

            // Get current subscription
            const subscriptionDoc = await db.doc(`subscriptions/${tenantId}`).get();

            if (!subscriptionDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'No subscription found');
            }

            const currentSub = subscriptionDoc.data();
            const stripeSubscriptionId = currentSub?.stripeSubscriptionId;

            if (!stripeSubscriptionId) {
                // No Stripe subscription, just update Firestore
                await db.doc(`subscriptions/${tenantId}`).update({
                    planId: 'free',
                    status: 'cancelled',
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    cancellationReason: reason,
                });

                return { success: true, message: 'Subscription cancelled' };
            }

            let cancelledSubscription;

            if (immediately) {
                // Cancel immediately
                cancelledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId, {
                    cancellation_details: {
                        comment: reason,
                    },
                });
            } else {
                // Cancel at period end
                cancelledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                    cancel_at_period_end: true,
                    metadata: {
                        cancellation_reason: reason || 'User requested cancellation',
                    },
                });
            }

            // Update Firestore
            const updates: any = {
                cancelAtPeriodEnd: !immediately,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (immediately) {
                updates.status = 'cancelled';
                updates.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
                updates.planId = 'free';
            }

            if (reason) {
                updates.cancellationReason = reason;
            }

            await db.doc(`subscriptions/${tenantId}`).update(updates);

            // If immediately cancelled, reset credits to free plan
            if (immediately) {
                await db.doc(`aiCreditsUsage/${tenantId}`).update({
                    planId: 'free',
                    // Primary fields
                    limit: 30,
                    used: 0,
                    // Legacy fields
                    creditsIncluded: 30,
                    creditsUsed: 0,
                    creditsRemaining: 30,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            console.log(`[Stripe] Subscription cancelled for tenant ${tenantId}, immediately: ${immediately}`);

            return {
                success: true,
                message: immediately
                    ? 'Subscription cancelled immediately'
                    : `Subscription will cancel on ${new Date(cancelledSubscription.current_period_end * 1000).toLocaleDateString()}`,
                cancelsAt: immediately ? null : new Date(cancelledSubscription.current_period_end * 1000).toISOString(),
            };

        } catch (error: any) {
            console.error('Error cancelling subscription:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to cancel subscription'
            );
        }
    }
);

/**
 * Reactivate a subscription that was set to cancel
 */
export const reactivateSubscription = functions.https.onCall(
    async (data: { tenantId: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { tenantId } = data;

        if (!tenantId) {
            throw new functions.https.HttpsError('invalid-argument', 'Tenant ID is required');
        }

        try {
            const stripe = getStripe();
            const admin = await import('firebase-admin');
            const db = admin.firestore();

            const subscriptionDoc = await db.doc(`subscriptions/${tenantId}`).get();

            if (!subscriptionDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'No subscription found');
            }

            const currentSub = subscriptionDoc.data();
            const stripeSubscriptionId = currentSub?.stripeSubscriptionId;

            if (!stripeSubscriptionId) {
                throw new functions.https.HttpsError('failed-precondition', 'No Stripe subscription to reactivate');
            }

            // Remove cancellation
            const reactivatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                cancel_at_period_end: false,
            });

            // Update Firestore
            await db.doc(`subscriptions/${tenantId}`).update({
                cancelAtPeriodEnd: false,
                status: 'active',
                cancellationReason: null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`[Stripe] Subscription reactivated for tenant ${tenantId}`);

            return {
                success: true,
                message: 'Subscription reactivated successfully',
                currentPeriodEnd: new Date(reactivatedSubscription.current_period_end * 1000).toISOString(),
            };

        } catch (error: any) {
            console.error('Error reactivating subscription:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to reactivate subscription'
            );
        }
    }
);

/**
 * Get subscription details including billing history
 */
export const getSubscriptionDetails = functions.https.onCall(
    async (data: { tenantId: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { tenantId } = data;

        try {
            const stripe = getStripe();
            const admin = await import('firebase-admin');
            const db = admin.firestore();

            const subscriptionDoc = await db.doc(`subscriptions/${tenantId}`).get();

            if (!subscriptionDoc.exists) {
                return { subscription: null, invoices: [] };
            }

            const currentSub = subscriptionDoc.data();
            const stripeSubscriptionId = currentSub?.stripeSubscriptionId;
            const stripeCustomerId = currentSub?.stripeCustomerId;

            let stripeDetails = null;
            let invoices: any[] = [];

            if (stripeSubscriptionId) {
                try {
                    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
                        expand: ['items.data.price.product'],
                    });

                    stripeDetails = {
                        status: stripeSub.status,
                        currentPeriodStart: new Date(stripeSub.current_period_start * 1000).toISOString(),
                        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
                        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                        cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000).toISOString() : null,
                        trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
                    };
                } catch (e) {
                    console.error('Error fetching Stripe subscription:', e);
                }
            }

            if (stripeCustomerId) {
                try {
                    const stripeInvoices = await stripe.invoices.list({
                        customer: stripeCustomerId,
                        limit: 10,
                    });

                    invoices = stripeInvoices.data.map(inv => ({
                        id: inv.id,
                        number: inv.number,
                        amount: (inv.amount_paid || 0) / 100,
                        status: inv.status,
                        date: new Date((inv.created || 0) * 1000).toISOString(),
                        pdfUrl: inv.invoice_pdf,
                        hostedUrl: inv.hosted_invoice_url,
                    }));
                } catch (e) {
                    console.error('Error fetching invoices:', e);
                }
            }

            return {
                subscription: {
                    ...currentSub,
                    stripe: stripeDetails,
                },
                invoices,
            };

        } catch (error: any) {
            console.error('Error getting subscription details:', error);
            throw new functions.https.HttpsError(
                'internal',
                error.message || 'Failed to get subscription details'
            );
        }
    }
);

// Helper function to get plan limits
async function getPlanLimits(planId: string): Promise<{ maxAiCredits: number }> {
    const planCredits: Record<string, number> = {
        free: 30,
        hobby: 100,
        starter: 300,
        individual: 500,        // Nuevo plan Individual
        pro: 1500,
        agency: 5000,
        agency_starter: 2000,   // Nuevos planes de agencia
        agency_pro: 5000,
        agency_scale: 15000,
        agency_plus: 10000,
        enterprise: 25000,
    };

    return {
        maxAiCredits: planCredits[planId] || 30,
    };
}

/**
 * Archive (deactivate) a plan in Stripe
 */
export const archivePlan = functions.https.onRequest(async (req, res) => {
    res.set(corsHeaders);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const stripe = getStripe();
        const { productId } = req.body as { productId: string };

        if (!productId) {
            res.status(400).json({ error: 'Product ID is required' });
            return;
        }

        // Deactivate the product
        await stripe.products.update(productId, { active: false });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error archiving plan:', error);
        res.status(500).json({
            error: 'Failed to archive plan',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});






