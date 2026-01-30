/**
 * Stripe Connect Agency Billing
 * Handles billing for agency sub-clients using Stripe Connect
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { isPlatformAdmin } from '../utils/platformAdmin';

const db = admin.firestore();
const stripe = new Stripe(functions.config().stripe.secret_key);

const BASE_URL = functions.config().app?.base_url || 'https://quimera.ai';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function verifyAgencyOwner(userId: string, tenantId?: string): Promise<string> {
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if user is platform Owner/SuperAdmin (full access to all tenants)
  const isAdmin = await isPlatformAdmin(userId);
  
  if (isAdmin && tenantId) {
    // Platform admins can access any tenant
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Tenant not found');
    }
    return tenantId;
  }

  // If tenantId provided, verify ownership of that specific tenant
  if (tenantId) {
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Tenant not found');
    }

    const tenantData = tenantDoc.data()!;
    
    // Platform admins bypass owner check
    if (!isAdmin && tenantData.ownerUserId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not the owner of this tenant');
    }

    return tenantId;
  }

  // Otherwise, find user's agency tenant
  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('role', '==', 'agency_owner')
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    throw new functions.https.HttpsError('permission-denied', 'User is not an agency owner');
  }

  const agencyTenantId = memberSnapshot.docs[0].data().tenantId;

  // Verify tenant is agency type
  const tenantDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const tenantData = tenantDoc.data()!;

  if (!['agency_starter', 'agency_pro', 'agency_scale', 'enterprise'].includes(tenantData.subscriptionPlan)) {
    throw new functions.https.HttpsError('permission-denied', 'Tenant is not an agency');
  }

  return agencyTenantId;
}

// ============================================================================
// STRIPE CONNECT SETUP
// ============================================================================

/**
 * Create Stripe Connect account for agency
 */
export const createStripeConnectAccount = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId, businessInfo } = data;
  const agencyTenantId = await verifyAgencyOwner(userId, tenantId);

  const tenantDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const tenantData = tenantDoc.data()!;

  try {
    // Check if already has Stripe Connect
    if (tenantData.billing?.stripeConnectAccountId) {
      const account = await stripe.accounts.retrieve(tenantData.billing.stripeConnectAccountId);

      return {
        success: true,
        accountId: account.id,
        alreadyExists: true,
        detailsSubmitted: account.details_submitted,
      };
    }

    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      country: businessInfo?.country || 'US',
      email: tenantData.ownerEmail || businessInfo?.email,
      business_type: businessInfo?.businessType || 'company',
      metadata: {
        tenantId: agencyTenantId,
        tenantName: tenantData.name,
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${BASE_URL}/dashboard/agency/billing/connect/refresh`,
      return_url: `${BASE_URL}/dashboard/agency/billing/connect/success`,
      type: 'account_onboarding',
    });

    // Save to Firestore
    await db.collection('tenants').doc(agencyTenantId).update({
      'billing.stripeConnectAccountId': account.id,
      'billing.stripeConnectStatus': 'pending',
      'billing.stripeConnectOnboardingUrl': accountLink.url,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Stripe Connect account created', { agencyTenantId, accountId: account.id });

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error: any) {
    functions.logger.error('Error creating Stripe Connect account', { error: error.message, agencyTenantId });
    throw new functions.https.HttpsError('internal', `Failed to create Stripe Connect account: ${error.message}`);
  }
});

/**
 * Get Stripe Connect account status
 */
export const getStripeConnectStatus = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId } = data;
  const agencyTenantId = await verifyAgencyOwner(userId, tenantId);

  const tenantDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const tenantData = tenantDoc.data()!;

  if (!tenantData.billing?.stripeConnectAccountId) {
    return {
      success: true,
      hasAccount: false,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(tenantData.billing.stripeConnectAccountId);

    // Update status in Firestore
    const status = account.details_submitted ? 'active' : 'pending';
    if (tenantData.billing.stripeConnectStatus !== status) {
      await db.collection('tenants').doc(agencyTenantId).update({
        'billing.stripeConnectStatus': status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      hasAccount: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
    };
  } catch (error: any) {
    functions.logger.error('Error getting Stripe Connect status', { error: error.message, agencyTenantId });
    throw new functions.https.HttpsError('internal', `Failed to get Stripe Connect status: ${error.message}`);
  }
});

// ============================================================================
// CLIENT BILLING SETUP
// ============================================================================

/**
 * Setup billing for a sub-client
 */
export const setupClientBilling = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clientTenantId, monthlyPrice, paymentMethod } = data;

  // Verify caller is agency owner
  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
  if (!clientDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Client tenant not found');
  }

  const clientData = clientDoc.data()!;
  const agencyTenantId = await verifyAgencyOwner(userId, clientData.ownerTenantId);

  // Get agency Stripe Connect account
  const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
  const agencyData = agencyDoc.data()!;

  if (!agencyData.billing?.stripeConnectAccountId) {
    throw new functions.https.HttpsError('failed-precondition', 'Agency must setup Stripe Connect first');
  }

  try {
    // Create or retrieve Stripe customer
    let customerId = clientData.billing?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clientData.ownerEmail,
        name: clientData.name,
        metadata: {
          tenantId: clientTenantId,
          agencyTenantId,
        },
      });
      customerId = customer.id;
    }

    // Attach payment method
    await stripe.paymentMethods.attach(paymentMethod, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod,
      },
    });

    // Create subscription with platform fee
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'usd',
          product: 'client_subscription',
          recurring: { interval: 'month' },
          unit_amount: monthlyPrice * 100, // Convert to cents
        },
      }],
      application_fee_percent: 10, // 10% platform fee for Quimera
      transfer_data: {
        destination: agencyData.billing.stripeConnectAccountId,
      },
      metadata: {
        clientTenantId,
        agencyTenantId,
      },
    });

    // Save billing info to Firestore
    const subscriptionData = subscription as any;
    await db.collection('tenants').doc(clientTenantId).update({
      'billing.stripeCustomerId': customerId,
      'billing.stripeSubscriptionId': subscriptionData.id,
      'billing.monthlyPrice': monthlyPrice,
      'billing.billingMode': 'direct',
      'billing.status': 'active',
      'billing.nextBillingDate': admin.firestore.Timestamp.fromDate(
        new Date(subscriptionData.current_period_end * 1000)
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Client billing setup complete', { clientTenantId, subscriptionId: subscriptionData.id });

    return {
      success: true,
      subscriptionId: subscriptionData.id,
      nextBillingDate: new Date(subscriptionData.current_period_end * 1000).toISOString(),
    };
  } catch (error: any) {
    functions.logger.error('Error setting up client billing', { error: error.message, clientTenantId });
    throw new functions.https.HttpsError('internal', `Failed to setup billing: ${error.message}`);
  }
});

/**
 * Update client monthly price
 */
export const updateClientMonthlyPrice = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clientTenantId, newMonthlyPrice } = data;

  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
  if (!clientDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Client tenant not found');
  }

  const clientData = clientDoc.data()!;
  await verifyAgencyOwner(userId, clientData.ownerTenantId);

  const subscriptionId = clientData.billing?.stripeSubscriptionId;
  if (!subscriptionId) {
    throw new functions.https.HttpsError('failed-precondition', 'Client does not have active subscription');
  }

  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update subscription item with new price (prorated automatically)
    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price_data: {
          currency: 'usd',
          product: 'client_subscription',
          recurring: { interval: 'month' },
          unit_amount: newMonthlyPrice * 100,
        },
      }],
      proration_behavior: 'create_prorations',
    });

    // Update Firestore
    await db.collection('tenants').doc(clientTenantId).update({
      'billing.monthlyPrice': newMonthlyPrice,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Client monthly price updated', { clientTenantId, newMonthlyPrice });

    return {
      success: true,
      newMonthlyPrice,
    };
  } catch (error: any) {
    functions.logger.error('Error updating client price', { error: error.message, clientTenantId });
    throw new functions.https.HttpsError('internal', `Failed to update price: ${error.message}`);
  }
});

/**
 * Cancel client subscription
 */
export const cancelClientSubscription = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clientTenantId, immediate = false } = data;

  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
  if (!clientDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Client tenant not found');
  }

  const clientData = clientDoc.data()!;
  await verifyAgencyOwner(userId, clientData.ownerTenantId);

  const subscriptionId = clientData.billing?.stripeSubscriptionId;
  if (!subscriptionId) {
    throw new functions.https.HttpsError('failed-precondition', 'Client does not have active subscription');
  }

  try {
    if (immediate) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscriptionId);

      await db.collection('tenants').doc(clientTenantId).update({
        'billing.status': 'canceled',
        'billing.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
        status: 'suspended',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      await db.collection('tenants').doc(clientTenantId).update({
        'billing.cancelAtPeriodEnd': true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    functions.logger.info('Client subscription canceled', { clientTenantId, immediate });

    return {
      success: true,
      immediate,
    };
  } catch (error: any) {
    functions.logger.error('Error canceling subscription', { error: error.message, clientTenantId });
    throw new functions.https.HttpsError('internal', `Failed to cancel subscription: ${error.message}`);
  }
});

/**
 * Generate manual invoice for client
 */
export const generateClientInvoice = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { clientTenantId, description, amount, chargeImmediately = false } = data;

  const clientDoc = await db.collection('tenants').doc(clientTenantId).get();
  if (!clientDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Client tenant not found');
  }

  const clientData = clientDoc.data()!;
  const agencyTenantId = await verifyAgencyOwner(userId, clientData.ownerTenantId);

  const customerId = clientData.billing?.stripeCustomerId;
  if (!customerId) {
    throw new functions.https.HttpsError('failed-precondition', 'Client does not have Stripe customer');
  }

  try {
    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: amount * 100,
      currency: 'usd',
      description,
    });

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: chargeImmediately,
      metadata: {
        clientTenantId,
        agencyTenantId,
      },
    });

    if (chargeImmediately) {
      await stripe.invoices.pay(invoice.id);
    } else {
      await stripe.invoices.sendInvoice(invoice.id);
    }

    // Save invoice record
    await db.collection('invoices').add({
      agencyTenantId,
      clientTenantId,
      stripeInvoiceId: invoice.id,
      amount,
      description,
      status: chargeImmediately ? 'paid' : 'sent',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Manual invoice generated', { clientTenantId, invoiceId: invoice.id });

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceUrl: invoice.hosted_invoice_url,
    };
  } catch (error: any) {
    functions.logger.error('Error generating invoice', { error: error.message, clientTenantId });
    throw new functions.https.HttpsError('internal', `Failed to generate invoice: ${error.message}`);
  }
});

// ============================================================================
// AGENCY PROJECT BILLING (Fee + Per-Project Model)
// ============================================================================

/**
 * Agency billing plan details
 */
const AGENCY_BILLING_PLANS: Record<string, { baseFee: number; projectCost: number; poolCredits: number }> = {
  agency_starter: { baseFee: 99, projectCost: 29, poolCredits: 2000 },
  agency_pro: { baseFee: 199, projectCost: 29, poolCredits: 5000 },
  agency_scale: { baseFee: 399, projectCost: 29, poolCredits: 15000 },
};

/**
 * Check if plan uses project-based billing
 */
function isProjectBillingPlan(plan: string): boolean {
  return Object.keys(AGENCY_BILLING_PLANS).includes(plan);
}

/**
 * Calculate total monthly bill for agency
 */
function calculateAgencyBill(plan: string, activeProjects: number): number {
  const details = AGENCY_BILLING_PLANS[plan];
  if (!details) return 0;
  return details.baseFee + (details.projectCost * activeProjects);
}

/**
 * Update agency project count and recalculate billing
 */
export const updateAgencyProjectCount = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId } = data;
  const agencyTenantId = await verifyAgencyOwner(userId, tenantId);

  try {
    // Get agency tenant
    const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
    const agencyData = agencyDoc.data()!;

    // Check if this plan uses project billing
    if (!isProjectBillingPlan(agencyData.subscriptionPlan)) {
      return {
        success: true,
        message: 'Plan does not use project-based billing',
        activeProjects: 0,
        totalMonthlyBill: agencyData.billing?.monthlyPrice || 0,
      };
    }

    // Count all active projects across agency and sub-clients
    let totalActiveProjects = 0;
    const projectsByClient: Record<string, { name: string; count: number }> = {};

    // Count agency's own projects
    const agencyProjectsSnapshot = await db.collection('tenants').doc(agencyTenantId)
      .collection('projects')
      .where('status', 'in', ['active', 'published'])
      .get();
    
    const agencyProjectCount = agencyProjectsSnapshot.size;
    totalActiveProjects += agencyProjectCount;
    projectsByClient[agencyTenantId] = { name: agencyData.name, count: agencyProjectCount };

    // Get all sub-clients
    const subClientsSnapshot = await db.collection('tenants')
      .where('ownerTenantId', '==', agencyTenantId)
      .where('status', '==', 'active')
      .get();

    // Count projects for each sub-client
    for (const clientDoc of subClientsSnapshot.docs) {
      const clientData = clientDoc.data();
      
      // Projects can be in tenant's subcollection or in users collection
      const clientProjectsSnapshot = await db.collection('tenants').doc(clientDoc.id)
        .collection('projects')
        .where('status', 'in', ['active', 'published'])
        .get();

      const clientProjectCount = clientProjectsSnapshot.size;
      totalActiveProjects += clientProjectCount;
      projectsByClient[clientDoc.id] = { name: clientData.name, count: clientProjectCount };
    }

    // Calculate new monthly bill
    const planDetails = AGENCY_BILLING_PLANS[agencyData.subscriptionPlan];
    const totalMonthlyBill = calculateAgencyBill(agencyData.subscriptionPlan, totalActiveProjects);

    // Update agency billing info
    await db.collection('tenants').doc(agencyTenantId).update({
      'billing.isAgencyBilling': true,
      'billing.agencyBaseFee': planDetails.baseFee,
      'billing.projectCost': planDetails.projectCost,
      'billing.activeProjectsCount': totalActiveProjects,
      'billing.totalMonthlyBill': totalMonthlyBill,
      'billing.lastProjectCountUpdate': admin.firestore.FieldValue.serverTimestamp(),
      'billing.projectBreakdown': projectsByClient,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update Stripe subscription if exists
    if (agencyData.billing?.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(agencyData.billing.stripeSubscriptionId);
        
        // Update subscription with new amount
        await stripe.subscriptions.update(agencyData.billing.stripeSubscriptionId, {
          items: [{
            id: subscription.items.data[0].id,
            price_data: {
              currency: 'usd',
              product: subscription.items.data[0].price.product as string,
              recurring: { interval: 'month' },
              unit_amount: totalMonthlyBill * 100, // Convert to cents
            },
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            ...subscription.metadata,
            activeProjects: totalActiveProjects.toString(),
            baseFee: planDetails.baseFee.toString(),
            projectCost: planDetails.projectCost.toString(),
          },
        });

        functions.logger.info('Stripe subscription updated with new project count', {
          agencyTenantId,
          activeProjects: totalActiveProjects,
          newAmount: totalMonthlyBill,
        });
      } catch (stripeError: any) {
        functions.logger.warn('Could not update Stripe subscription', { error: stripeError.message });
      }
    }

    functions.logger.info('Agency project count updated', {
      agencyTenantId,
      activeProjects: totalActiveProjects,
      totalMonthlyBill,
    });

    return {
      success: true,
      activeProjects: totalActiveProjects,
      totalMonthlyBill,
      baseFee: planDetails.baseFee,
      projectCost: planDetails.projectCost,
      breakdown: projectsByClient,
    };

  } catch (error: any) {
    functions.logger.error('Error updating agency project count', { error: error.message, agencyTenantId });
    throw new functions.https.HttpsError('internal', `Failed to update project count: ${error.message}`);
  }
});

/**
 * Get agency billing summary
 */
export const getAgencyBillingSummary = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId } = data;
  const agencyTenantId = await verifyAgencyOwner(userId, tenantId);

  try {
    const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
    const agencyData = agencyDoc.data()!;

    const billing = agencyData.billing || {};
    const plan = agencyData.subscriptionPlan;
    const planDetails = AGENCY_BILLING_PLANS[plan];

    if (!planDetails) {
      return {
        success: true,
        isProjectBilling: false,
        plan,
        monthlyPrice: billing.monthlyPrice || 0,
      };
    }

    return {
      success: true,
      isProjectBilling: true,
      plan,
      baseFee: planDetails.baseFee,
      projectCost: planDetails.projectCost,
      poolCredits: planDetails.poolCredits,
      activeProjects: billing.activeProjectsCount || 0,
      totalMonthlyBill: billing.totalMonthlyBill || planDetails.baseFee,
      breakdown: billing.projectBreakdown || {},
      lastUpdated: billing.lastProjectCountUpdate,
    };

  } catch (error: any) {
    functions.logger.error('Error getting billing summary', { error: error.message, agencyTenantId });
    throw new functions.https.HttpsError('internal', `Failed to get billing summary: ${error.message}`);
  }
});

/**
 * Firestore trigger: Update agency billing when projects change
 * Monitors tenant project subcollections
 */
export const onTenantProjectChange = functions.firestore
  .document('tenants/{tenantId}/projects/{projectId}')
  .onWrite(async (change, context) => {
    const { tenantId } = context.params;

    try {
      // Get tenant info
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) return;

      const tenantData = tenantDoc.data()!;
      let agencyTenantId: string | null = null;

      // Check if this is an agency or a sub-client
      if (isProjectBillingPlan(tenantData.subscriptionPlan)) {
        // This is the agency itself
        agencyTenantId = tenantId;
      } else if (tenantData.ownerTenantId) {
        // This is a sub-client, get parent agency
        const parentDoc = await db.collection('tenants').doc(tenantData.ownerTenantId).get();
        if (parentDoc.exists) {
          const parentData = parentDoc.data()!;
          if (isProjectBillingPlan(parentData.subscriptionPlan)) {
            agencyTenantId = tenantData.ownerTenantId;
          }
        }
      }

      if (!agencyTenantId) {
        // Not related to project billing
        return;
      }

      // Debounce: check if we updated recently (within 5 seconds)
      const agencyDoc = await db.collection('tenants').doc(agencyTenantId).get();
      const agencyData = agencyDoc.data()!;
      const lastUpdate = agencyData.billing?.lastProjectCountUpdate;
      
      if (lastUpdate) {
        const lastUpdateTime = lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate.seconds * 1000);
        const timeSinceUpdate = Date.now() - lastUpdateTime.getTime();
        if (timeSinceUpdate < 5000) {
          functions.logger.info('Skipping project count update (debounce)', { agencyTenantId, timeSinceUpdate });
          return;
        }
      }

      // Recount projects
      let totalActiveProjects = 0;

      // Count agency's own projects
      const agencyProjectsSnapshot = await db.collection('tenants').doc(agencyTenantId)
        .collection('projects')
        .where('status', 'in', ['active', 'published'])
        .get();
      totalActiveProjects += agencyProjectsSnapshot.size;

      // Get all sub-clients
      const subClientsSnapshot = await db.collection('tenants')
        .where('ownerTenantId', '==', agencyTenantId)
        .where('status', '==', 'active')
        .get();

      // Count projects for each sub-client
      for (const clientDoc of subClientsSnapshot.docs) {
        const clientProjectsSnapshot = await db.collection('tenants').doc(clientDoc.id)
          .collection('projects')
          .where('status', 'in', ['active', 'published'])
          .get();
        totalActiveProjects += clientProjectsSnapshot.size;
      }

      // Calculate and update billing
      const planDetails = AGENCY_BILLING_PLANS[agencyData.subscriptionPlan];
      if (planDetails) {
        const totalMonthlyBill = calculateAgencyBill(agencyData.subscriptionPlan, totalActiveProjects);

        await db.collection('tenants').doc(agencyTenantId).update({
          'billing.activeProjectsCount': totalActiveProjects,
          'billing.totalMonthlyBill': totalMonthlyBill,
          'billing.lastProjectCountUpdate': admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Agency project count auto-updated', {
          agencyTenantId,
          activeProjects: totalActiveProjects,
          totalMonthlyBill,
          trigger: 'project_change',
        });
      }

    } catch (error: any) {
      functions.logger.error('Error in project change trigger', { error: error.message, tenantId });
    }
  });
