/**
 * Stripe Billing Cloud Functions
 * Provides real billing metrics from Stripe for the Super Admin dashboard
 */

import * as functions from 'firebase-functions';
import Stripe from 'stripe';

// Initialize Stripe
const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
    if (!secretKey) {
        throw new Error('Stripe secret key not configured');
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
