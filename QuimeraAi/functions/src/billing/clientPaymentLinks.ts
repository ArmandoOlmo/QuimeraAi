/**
 * Client Payment Links
 * Cloud Functions for generating branded checkout links
 * and processing payments for agency sub-clients via Stripe Connect
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { isPlatformAdmin } from '../utils/platformAdmin';
import * as crypto from 'crypto';

const db = admin.firestore();
const stripe = new Stripe(functions.config().stripe.secret_key);

const BASE_URL = functions.config().app?.base_url || 'https://quimera.ai';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentLinkData {
    token: string;
    agencyTenantId: string;
    clientTenantId: string;
    clientName: string;
    clientEmail: string;
    planId: string;
    planName: string;
    monthlyPrice: number;
    planFeatures: string[];
    planLimits: Record<string, any>;
    // Agency branding
    agencyName: string;
    agencyLogoUrl: string;
    agencyPrimaryColor: string;
    agencySecondaryColor: string;
    agencySupportEmail: string;
    // Status
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    expiresAt: admin.firestore.Timestamp;
    createdAt: admin.firestore.Timestamp;
    createdByUserId: string;
    completedAt?: admin.firestore.Timestamp;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
}

// ============================================================================
// HELPER: Verify Agency Owner
// ============================================================================

async function verifyAgencyOwner(userId: string, tenantId?: string): Promise<string> {
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await isPlatformAdmin(userId);

    if (isAdmin && tenantId) {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant not found');
        }
        return tenantId;
    }

    if (tenantId) {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant not found');
        }
        const tenantData = tenantDoc.data()!;
        if (!isAdmin && tenantData.ownerUserId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not the owner of this tenant');
        }
        return tenantId;
    }

    // Find user's agency tenant
    const memberSnapshot = await db.collection('tenantMembers')
        .where('userId', '==', userId)
        .where('role', '==', 'agency_owner')
        .limit(1)
        .get();

    if (memberSnapshot.empty) {
        throw new functions.https.HttpsError('permission-denied', 'User is not an agency owner');
    }

    return memberSnapshot.docs[0].data().tenantId;
}

// ============================================================================
// CREATE PAYMENT LINK
// ============================================================================

/**
 * Creates a branded payment link for a sub-client to complete payment.
 * The link contains a token that maps to payment details in Firestore.
 */
export const createClientPaymentLink = functions.https.onCall(async (data, context) => {
    const userId = context.auth?.uid;
    if (!userId) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { clientTenantId, planId, customPrice } = data;

    if (!clientTenantId || !planId) {
        throw new functions.https.HttpsError('invalid-argument', 'clientTenantId and planId are required');
    }

    // Verify caller is agency owner
    const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
    if (!clientDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Client tenant not found');
    }
    const clientData = clientDoc.data()!;
    const agencyTenantId = await verifyAgencyOwner(userId, clientData.ownerTenantId);

    // Get agency tenant data (for branding + Stripe Connect)
    const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
    const agencyData = agencyDoc.data()!;

    if (!agencyData.billing?.stripeConnectAccountId) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'La agencia debe configurar Stripe Connect antes de crear links de pago'
        );
    }

    // Get the agency plan
    const planDoc = await db.collection('agencyPlans').doc(planId).get();
    if (!planDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Plan not found');
    }
    const planData = planDoc.data()!;

    // Verify plan belongs to this agency
    if (planData.tenantId !== agencyTenantId) {
        throw new functions.https.HttpsError('permission-denied', 'Plan does not belong to this agency');
    }

    // Check for existing pending link for this client
    const existingLinks = await db.collection('paymentLinks')
        .where('clientTenantId', '==', clientTenantId)
        .where('status', '==', 'pending')
        .get();

    // Cancel any existing pending links
    const batch = db.batch();
    existingLinks.docs.forEach(doc => {
        batch.update(doc.ref, { status: 'cancelled' });
    });
    if (!existingLinks.empty) {
        await batch.commit();
    }

    // Generate token
    const token = crypto.randomBytes(16).toString('hex');

    // Build feature list for display
    const features: string[] = [];
    if (planData.limits?.maxProjects) {
        features.push(`${planData.limits.maxProjects === -1 ? 'Ilimitados' : planData.limits.maxProjects} proyectos`);
    }
    if (planData.limits?.maxAiCredits) {
        features.push(`${planData.limits.maxAiCredits.toLocaleString()} AI Credits/mes`);
    }
    if (planData.limits?.maxUsers) {
        features.push(`${planData.limits.maxUsers} usuarios`);
    }
    if (planData.limits?.maxStorageGB) {
        features.push(`${planData.limits.maxStorageGB} GB almacenamiento`);
    }
    if (planData.features) {
        if (planData.features.customDomains) features.push('Dominio personalizado');
        if (planData.features.ecommerceEnabled) features.push('E-commerce');
        if (planData.features.chatbotEnabled) features.push('AI Chatbot');
        if (planData.features.emailMarketing) features.push('Email Marketing');
        if (planData.features.crmEnabled) features.push('CRM');
    }

    const monthlyPrice = customPrice || planData.price;

    // Create payment link document
    const paymentLink: PaymentLinkData = {
        token,
        agencyTenantId,
        clientTenantId,
        clientName: clientData.name || 'Cliente',
        clientEmail: clientData.ownerEmail || '',
        planId,
        planName: planData.name,
        monthlyPrice,
        planFeatures: features,
        planLimits: planData.limits || {},
        // Agency branding
        agencyName: agencyData.branding?.companyName || agencyData.name || 'Agency',
        agencyLogoUrl: agencyData.branding?.logoUrl || '',
        agencyPrimaryColor: agencyData.branding?.primaryColor || '#4f46e5',
        agencySecondaryColor: agencyData.branding?.secondaryColor || '#10b981',
        agencySupportEmail: agencyData.branding?.supportEmail || agencyData.ownerEmail || '',
        // Status
        status: 'pending',
        expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
        ),
        createdAt: admin.firestore.Timestamp.now(),
        createdByUserId: userId,
    };

    await db.collection('paymentLinks').doc(token).set(paymentLink);

    const paymentUrl = `${BASE_URL}/pay/${token}`;

    functions.logger.info('Payment link created', {
        token,
        clientTenantId,
        planId,
        agencyTenantId,
        monthlyPrice,
    });

    return {
        success: true,
        token,
        paymentUrl,
        expiresAt: paymentLink.expiresAt.toDate().toISOString(),
    };
});

// ============================================================================
// CONFIRM CLIENT PAYMENT
// ============================================================================

/**
 * Processes the payment after the client submits their card info.
 * Creates a Stripe subscription via the agency's Connect account.
 * This is called WITHOUT authentication (public checkout page).
 */
export const confirmClientPayment = functions.https.onCall(async (data) => {
    const { token, paymentMethodId } = data;

    if (!token || !paymentMethodId) {
        throw new functions.https.HttpsError('invalid-argument', 'token and paymentMethodId are required');
    }

    // Get payment link
    const linkDoc = await db.collection('paymentLinks').doc(token).get();
    if (!linkDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Payment link not found or has expired');
    }

    const linkData = linkDoc.data() as PaymentLinkData;

    // Validate status
    if (linkData.status !== 'pending') {
        throw new functions.https.HttpsError(
            'failed-precondition',
            linkData.status === 'completed'
                ? 'Este link de pago ya fue utilizado'
                : 'Este link de pago ha expirado o fue cancelado'
        );
    }

    // Check expiration
    if (linkData.expiresAt.toDate() < new Date()) {
        await db.collection('paymentLinks').doc(token).update({ status: 'expired' });
        throw new functions.https.HttpsError('failed-precondition', 'Este link de pago ha expirado');
    }

    // Get agency Stripe Connect account
    const agencyDoc = await db.collection('tenants').doc(linkData.agencyTenantId).get();
    if (!agencyDoc.exists) {
        throw new functions.https.HttpsError('internal', 'Agency tenant not found');
    }
    const agencyData = agencyDoc.data()!;

    if (!agencyData.billing?.stripeConnectAccountId) {
        throw new functions.https.HttpsError('internal', 'Agency Stripe Connect not configured');
    }

    const connectAccountId = agencyData.billing.stripeConnectAccountId;

    try {
        // 1. Create or retrieve Stripe customer for the client
        const clientDoc = await db.collection('tenants').doc(linkData.clientTenantId).get();
        const clientData = clientDoc.exists ? clientDoc.data()! : {};
        let customerId = clientData?.billing?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: linkData.clientEmail,
                name: linkData.clientName,
                metadata: {
                    tenantId: linkData.clientTenantId,
                    agencyTenantId: linkData.agencyTenantId,
                    source: 'payment_link',
                },
            });
            customerId = customer.id;
        }

        // 2. Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        // 3. Set as default payment method
        await stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // 4. Create a Stripe Product for this agency plan if needed
        let productId: string;
        try {
            // Try to retrieve existing product
            const existingProduct = await stripe.products.retrieve(`agency_plan_${linkData.planId}`);
            productId = existingProduct.id;
        } catch {
            // Create new product
            const product = await stripe.products.create({
                id: `agency_plan_${linkData.planId}`,
                name: `${linkData.agencyName} - ${linkData.planName}`,
                metadata: {
                    agencyTenantId: linkData.agencyTenantId,
                    planId: linkData.planId,
                },
            });
            productId = product.id;
        }

        // 5. Create subscription with platform fee via Connect
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{
                price_data: {
                    currency: 'usd',
                    product: productId,
                    recurring: { interval: 'month' },
                    unit_amount: Math.round(linkData.monthlyPrice * 100), // Convert to cents
                },
            }],
            application_fee_percent: 10, // 10% platform fee for Quimera
            transfer_data: {
                destination: connectAccountId,
            },
            metadata: {
                clientTenantId: linkData.clientTenantId,
                agencyTenantId: linkData.agencyTenantId,
                planId: linkData.planId,
                source: 'payment_link',
                paymentLinkToken: token,
            },
            payment_behavior: 'default_incomplete',
            payment_settings: {
                payment_method_types: ['card'],
                save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.payment_intent'],
        });

        const subscriptionData = subscription as any;

        // 6. Update client tenant with billing info and plan
        await db.collection('tenants').doc(linkData.clientTenantId).update({
            // Plan assignment
            agencyPlanId: linkData.planId,
            agencyPlanName: linkData.planName,
            limits: linkData.planLimits,
            // Billing info
            'billing.stripeCustomerId': customerId,
            'billing.stripeSubscriptionId': subscription.id,
            'billing.monthlyPrice': linkData.monthlyPrice,
            'billing.billingMode': 'direct',
            'billing.status': 'active',
            'billing.nextBillingDate': admin.firestore.Timestamp.fromDate(
                new Date(subscription.current_period_end * 1000)
            ),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 7. Update plan client count
        const planRef = db.collection('agencyPlans').doc(linkData.planId);
        const planDoc = await planRef.get();
        if (planDoc.exists) {
            const currentCount = planDoc.data()?.clientCount || 0;
            await planRef.update({
                clientCount: currentCount + 1,
            });
        }

        // 8. Mark payment link as completed
        await db.collection('paymentLinks').doc(token).update({
            status: 'completed',
            completedAt: admin.firestore.Timestamp.now(),
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
        });

        // 9. Log activity
        await db.collection('agencyActivity').add({
            tenantId: linkData.agencyTenantId,
            type: 'client_payment_completed',
            message: `${linkData.clientName} completó el pago del plan ${linkData.planName}`,
            metadata: {
                clientTenantId: linkData.clientTenantId,
                planId: linkData.planId,
                monthlyPrice: linkData.monthlyPrice,
                paymentLinkToken: token,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Client payment completed via payment link', {
            token,
            clientTenantId: linkData.clientTenantId,
            subscriptionId: subscription.id,
        });

        // Check if the subscription requires payment confirmation
        const latestInvoice = subscriptionData.latest_invoice;
        const paymentIntent = latestInvoice?.payment_intent;

        if (paymentIntent && paymentIntent.status === 'requires_action') {
            return {
                success: true,
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: subscription.id,
            };
        }

        return {
            success: true,
            requiresAction: false,
            subscriptionId: subscription.id,
            nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
        };

    } catch (error: any) {
        functions.logger.error('Error processing payment link', {
            error: error.message,
            token,
            clientTenantId: linkData.clientTenantId,
        });

        // Provide user-friendly error messages
        if (error.type === 'StripeCardError') {
            throw new functions.https.HttpsError('failed-precondition', `Error de tarjeta: ${error.message}`);
        }

        throw new functions.https.HttpsError(
            'internal',
            `Error al procesar el pago: ${error.message}`
        );
    }
});

// ============================================================================
// GET PAYMENT LINK INFO (Public - for checkout page)
// ============================================================================

/**
 * Returns payment link data for rendering the checkout page.
 * Excludes sensitive internal fields.
 */
export const getPaymentLinkInfo = functions.https.onCall(async (data) => {
    const { token } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'token is required');
    }

    const linkDoc = await db.collection('paymentLinks').doc(token).get();
    if (!linkDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Payment link not found');
    }

    const linkData = linkDoc.data() as PaymentLinkData;

    // Check expiration
    if (linkData.status === 'pending' && linkData.expiresAt.toDate() < new Date()) {
        await db.collection('paymentLinks').doc(token).update({ status: 'expired' });
        linkData.status = 'expired';
    }

    // Return only what the checkout page needs (no internal IDs)
    return {
        status: linkData.status,
        clientName: linkData.clientName,
        planName: linkData.planName,
        monthlyPrice: linkData.monthlyPrice,
        planFeatures: linkData.planFeatures,
        expiresAt: linkData.expiresAt.toDate().toISOString(),
        // Agency branding
        agencyName: linkData.agencyName,
        agencyLogoUrl: linkData.agencyLogoUrl,
        agencyPrimaryColor: linkData.agencyPrimaryColor,
        agencySecondaryColor: linkData.agencySecondaryColor,
        agencySupportEmail: linkData.agencySupportEmail,
    };
});
