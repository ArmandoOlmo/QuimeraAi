"use strict";
/**
 * Stripe Connect for Agency Billing
 * Functions to handle agency billing to sub-clients
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
exports.generateClientInvoice = exports.cancelClientSubscription = exports.updateClientMonthlyPrice = exports.setupClientBilling = exports.getStripeConnectStatus = exports.createStripeConnectAccount = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
// Initialize Stripe
const stripe = new stripe_1.default(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
const PLATFORM_FEE_PERCENTAGE = 10; // Quimera platform fee
/**
 * Create Stripe Connect account for agency
 */
exports.createStripeConnectAccount = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId, businessInfo } = data;
        // Verify user is agency owner
        const isOwner = await verifyAgencyOwner(context.auth.uid, tenantId);
        if (!isOwner) {
            throw new functions.https.HttpsError('permission-denied', 'User must be agency owner');
        }
        // Get tenant data
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant not found');
        }
        const tenantData = tenantDoc.data();
        // Check if already has Connect account
        if (tenantData.billing?.stripeConnectAccountId) {
            throw new functions.https.HttpsError('already-exists', 'Stripe Connect account already exists');
        }
        // Create Connect account
        const account = await stripe.accounts.create({
            type: 'standard', // or 'express' for simpler onboarding
            country: businessInfo?.country || 'US',
            email: tenantData.ownerEmail || tenantData.contactEmail,
            business_type: 'company',
            company: {
                name: tenantData.name,
                phone: businessInfo?.phone,
                address: businessInfo?.address,
            },
            metadata: {
                tenantId,
                agencyName: tenantData.name,
            },
        });
        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${functions.config().app?.url || 'https://app.quimera.ai'}/dashboard/agency/billing/connect/refresh`,
            return_url: `${functions.config().app?.url || 'https://app.quimera.ai'}/dashboard/agency/billing/connect/success`,
            type: 'account_onboarding',
        });
        // Save Connect account ID
        await tenantDoc.ref.update({
            'billing.stripeConnectAccountId': account.id,
            'billing.stripeConnectStatus': 'pending',
            'billing.stripeConnectOnboardingUrl': accountLink.url,
            updatedAt: firestore_1.Timestamp.now(),
        });
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId: tenantId,
            type: 'billing_setup_started',
            description: 'Configuración de Stripe Connect iniciada',
            createdBy: context.auth.uid,
            timestamp: firestore_1.Timestamp.now(),
        });
        return {
            success: true,
            accountId: account.id,
            onboardingUrl: accountLink.url,
        };
    }
    catch (error) {
        console.error('Error creating Stripe Connect account:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Failed to create Stripe Connect account');
    }
});
/**
 * Get Stripe Connect account status
 */
exports.getStripeConnectStatus = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { tenantId } = data;
        const isOwner = await verifyAgencyOwner(context.auth.uid, tenantId);
        if (!isOwner) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        const tenantData = tenantDoc.data();
        const connectAccountId = tenantData.billing?.stripeConnectAccountId;
        if (!connectAccountId) {
            return {
                success: true,
                status: 'not_configured',
                charges_enabled: false,
                payouts_enabled: false,
            };
        }
        // Get account details from Stripe
        const account = await stripe.accounts.retrieve(connectAccountId);
        // Update status in database
        await tenantDoc.ref.update({
            'billing.stripeConnectStatus': account.charges_enabled ? 'active' : 'pending',
            'billing.stripeConnectChargesEnabled': account.charges_enabled,
            'billing.stripeConnectPayoutsEnabled': account.payouts_enabled,
            updatedAt: firestore_1.Timestamp.now(),
        });
        return {
            success: true,
            status: account.charges_enabled ? 'active' : 'pending',
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            requirements: account.requirements,
        };
    }
    catch (error) {
        console.error('Error getting Stripe Connect status:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to get account status');
    }
});
/**
 * Setup billing for a sub-client
 */
exports.setupClientBilling = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { clientTenantId, monthlyPrice, paymentMethodId } = data;
        // Get client tenant
        const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
        if (!clientDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Client not found');
        }
        const clientData = clientDoc.data();
        const agencyTenantId = clientData.ownerTenantId;
        // Verify caller is agency owner/admin
        const hasAccess = await verifyAgencyOwnerOrAdmin(context.auth.uid, agencyTenantId);
        if (!hasAccess) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        // Get agency Connect account
        const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
        const agencyData = agencyDoc.data();
        const connectAccountId = agencyData.billing?.stripeConnectAccountId;
        if (!connectAccountId) {
            throw new functions.https.HttpsError('failed-precondition', 'Agency must setup Stripe Connect first');
        }
        // Create customer in Stripe
        const customer = await stripe.customers.create({
            email: clientData.ownerEmail || clientData.contactEmail,
            name: clientData.name,
            metadata: {
                tenantId: clientTenantId,
                agencyTenantId,
            },
            payment_method: paymentMethodId,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        // Attach payment method to customer
        if (paymentMethodId) {
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customer.id,
            });
        }
        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    price_data: {
                        currency: 'usd',
                        product: 'prod_client_subscription', // Should be created in Stripe dashboard
                        recurring: { interval: 'month' },
                        unit_amount: Math.round(monthlyPrice * 100), // Convert to cents
                    },
                },
            ],
            application_fee_percent: PLATFORM_FEE_PERCENTAGE,
            transfer_data: {
                destination: connectAccountId,
            },
            metadata: {
                clientTenantId,
                agencyTenantId,
            },
        });
        // Calculate next billing date
        const nextBillingDate = new Date(subscription.current_period_end * 1000);
        // Update client tenant with billing info
        await clientDoc.ref.update({
            'billing.mode': 'direct',
            'billing.stripeCustomerId': customer.id,
            'billing.stripeSubscriptionId': subscription.id,
            'billing.monthlyPrice': monthlyPrice,
            'billing.nextBillingDate': firestore_1.Timestamp.fromDate(nextBillingDate),
            'billing.status': 'active',
            updatedAt: firestore_1.Timestamp.now(),
        });
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId,
            type: 'client_billing_setup',
            clientTenantId,
            clientName: clientData.name,
            description: `Facturación configurada: $${monthlyPrice}/mes`,
            metadata: {
                monthlyPrice,
                subscriptionId: subscription.id,
            },
            createdBy: context.auth.uid,
            timestamp: firestore_1.Timestamp.now(),
        });
        return {
            success: true,
            customerId: customer.id,
            subscriptionId: subscription.id,
            nextBillingDate: nextBillingDate.toISOString(),
        };
    }
    catch (error) {
        console.error('Error setting up client billing:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message || 'Failed to setup billing');
    }
});
/**
 * Update client monthly price
 */
exports.updateClientMonthlyPrice = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { clientTenantId, newMonthlyPrice } = data;
        const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
        if (!clientDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Client not found');
        }
        const clientData = clientDoc.data();
        const hasAccess = await verifyAgencyOwnerOrAdmin(context.auth.uid, clientData.ownerTenantId);
        if (!hasAccess) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const subscriptionId = clientData.billing?.stripeSubscriptionId;
        if (!subscriptionId) {
            throw new functions.https.HttpsError('failed-precondition', 'Client does not have active subscription');
        }
        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // Update subscription item price
        await stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: subscription.items.data[0].id,
                    price_data: {
                        currency: 'usd',
                        product: 'prod_client_subscription',
                        recurring: { interval: 'month' },
                        unit_amount: Math.round(newMonthlyPrice * 100),
                    },
                },
            ],
            proration_behavior: 'create_prorations', // Prorate the change
        });
        // Update database
        await clientDoc.ref.update({
            'billing.monthlyPrice': newMonthlyPrice,
            updatedAt: firestore_1.Timestamp.now(),
        });
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId: clientData.ownerTenantId,
            type: 'client_billing_updated',
            clientTenantId,
            clientName: clientData.name,
            description: `Precio mensual actualizado: $${newMonthlyPrice}`,
            createdBy: context.auth.uid,
            timestamp: firestore_1.Timestamp.now(),
        });
        return {
            success: true,
            newMonthlyPrice,
        };
    }
    catch (error) {
        console.error('Error updating monthly price:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update price');
    }
});
/**
 * Cancel client subscription
 */
exports.cancelClientSubscription = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { clientTenantId, cancelImmediately = false } = data;
        const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
        if (!clientDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Client not found');
        }
        const clientData = clientDoc.data();
        const hasAccess = await verifyAgencyOwnerOrAdmin(context.auth.uid, clientData.ownerTenantId);
        if (!hasAccess) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        const subscriptionId = clientData.billing?.stripeSubscriptionId;
        if (!subscriptionId) {
            throw new functions.https.HttpsError('failed-precondition', 'No active subscription');
        }
        // Cancel subscription
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: !cancelImmediately,
        });
        if (cancelImmediately) {
            await stripe.subscriptions.cancel(subscriptionId);
        }
        // Update database
        await clientDoc.ref.update({
            'billing.status': cancelImmediately ? 'cancelled' : 'cancelling',
            'billing.cancelAt': cancelImmediately
                ? firestore_1.Timestamp.now()
                : firestore_1.Timestamp.fromDate(new Date(subscription.cancel_at * 1000)),
            status: cancelImmediately ? 'cancelled' : clientData.status,
            updatedAt: firestore_1.Timestamp.now(),
        });
        // Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId: clientData.ownerTenantId,
            type: 'client_subscription_cancelled',
            clientTenantId,
            clientName: clientData.name,
            description: cancelImmediately
                ? 'Suscripción cancelada inmediatamente'
                : 'Suscripción cancelará al final del período',
            createdBy: context.auth.uid,
            timestamp: firestore_1.Timestamp.now(),
        });
        return {
            success: true,
            cancelledAt: cancelImmediately
                ? new Date()
                : new Date(subscription.cancel_at * 1000),
        };
    }
    catch (error) {
        console.error('Error cancelling subscription:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
    }
});
/**
 * Generate invoice for client
 */
exports.generateClientInvoice = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { clientTenantId, month, year, includeOverages = true } = data;
        const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
        if (!clientDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Client not found');
        }
        const clientData = clientDoc.data();
        const hasAccess = await verifyAgencyOwnerOrAdmin(context.auth.uid, clientData.ownerTenantId);
        if (!hasAccess) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied');
        }
        // Calculate usage and charges
        const baseCharge = clientData.billing?.monthlyPrice || 0;
        const usage = clientData.usage || {};
        const limits = clientData.limits || {};
        const overageCharges = includeOverages
            ? calculateOverageCharges(usage, limits)
            : { total: 0, details: [] };
        const totalAmount = baseCharge + overageCharges.total;
        // Create invoice record
        const invoiceDoc = await db.collection('invoices').add({
            agencyTenantId: clientData.ownerTenantId,
            clientTenantId,
            clientName: clientData.name,
            month,
            year,
            baseCharge,
            overageCharges: overageCharges.details,
            totalOverage: overageCharges.total,
            totalAmount,
            status: 'draft',
            createdAt: firestore_1.Timestamp.now(),
            createdBy: context.auth.uid,
        });
        return {
            success: true,
            invoiceId: invoiceDoc.id,
            invoice: {
                baseCharge,
                overageCharges: overageCharges.details,
                totalAmount,
            },
        };
    }
    catch (error) {
        console.error('Error generating invoice:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to generate invoice');
    }
});
/**
 * Calculate overage charges
 */
function calculateOverageCharges(usage, limits) {
    const details = [];
    let total = 0;
    // Storage overage ($0.10 per GB over limit)
    if (usage.storageUsedGB > limits.maxStorageGB) {
        const overage = usage.storageUsedGB - limits.maxStorageGB;
        const charge = overage * 0.1;
        details.push({
            type: 'storage',
            overage: overage.toFixed(2),
            rate: 0.1,
            charge: charge.toFixed(2),
        });
        total += charge;
    }
    // AI Credits overage ($0.02 per credit over limit)
    if (usage.aiCreditsUsed > limits.maxAiCredits) {
        const overage = usage.aiCreditsUsed - limits.maxAiCredits;
        const charge = overage * 0.02;
        details.push({
            type: 'aiCredits',
            overage: Math.round(overage),
            rate: 0.02,
            charge: charge.toFixed(2),
        });
        total += charge;
    }
    return { total, details };
}
/**
 * Helper: Verify user is agency owner
 */
async function verifyAgencyOwner(userId, tenantId) {
    const membershipSnapshot = await db
        .collection('tenantMembers')
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .where('role', '==', 'agency_owner')
        .limit(1)
        .get();
    return !membershipSnapshot.empty;
}
/**
 * Helper: Verify user is agency owner or admin
 */
async function verifyAgencyOwnerOrAdmin(userId, tenantId) {
    const membershipSnapshot = await db
        .collection('tenantMembers')
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .where('role', 'in', ['agency_owner', 'agency_admin'])
        .limit(1)
        .get();
    return !membershipSnapshot.empty;
}
//# sourceMappingURL=stripeConnectAgency.js.map