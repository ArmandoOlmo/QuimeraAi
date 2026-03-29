/**
 * Add-ons Management
 * Handles subscription add-ons for agencies (extra sub-clients, storage, AI credits)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();
const stripe = new Stripe(functions.config().stripe.secret_key);

// ============================================================================
// ADDON PRICING
// ============================================================================

export const ADDON_PRICES = {
  extraSubClients: 15,    // $15 per sub-client
  extraStorageGB: 10,     // $10 per 100GB block
  extraAiCredits: 20,     // $20 per 1000 credits block
};

export const ADDON_UNITS = {
  extraSubClients: 1,
  extraStorageGB: 100,    // Sold in 100GB blocks
  extraAiCredits: 1000,   // Sold in 1000 credit blocks
};

// Human-readable addon names for Stripe product creation
const ADDON_DISPLAY_NAMES: Record<string, string> = {
  extraSubClients: 'Sub-clientes Adicionales',
  extraStorageGB: 'Almacenamiento Extra (100GB)',
  extraAiCredits: 'AI Credits Extra (1000)',
};

// Plans eligible for add-ons (current + legacy + enterprise)
const ADDON_ELIGIBLE_PLANS = [
  // Current agency plans
  'agency_starter',
  'agency_pro',
  'agency_scale',
  // Legacy agency plans (for existing subscribers)
  'agency',
  'agency_plus',
  // Enterprise
  'enterprise',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function verifyAgencyOwner(userId: string, tenantId: string): Promise<void> {
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // First, check if user is the direct owner of the tenant
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (tenantDoc.exists) {
    const tenantData = tenantDoc.data();
    if (tenantData?.ownerId === userId || tenantData?.createdBy === userId) {
      return; // User is the tenant owner, allow access
    }
  }

  // Check tenantMembers for valid roles (including 'owner', 'Owner', 'agency_owner', 'agency_admin')
  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('tenantId', '==', tenantId)
    .limit(1)
    .get();

  if (!memberSnapshot.empty) {
    const memberData = memberSnapshot.docs[0].data();
    const role = memberData.role?.toLowerCase();
    if (['owner', 'agency_owner', 'agency_admin', 'super_admin', 'superadmin'].includes(role)) {
      return; // User has valid role
    }
  }

  throw new functions.https.HttpsError('permission-denied', 'User does not have permission to manage billing');
}

function calculateTotalAddonsPrice(addons: Record<string, number>): number {
  let total = 0;

  for (const [addonKey, quantity] of Object.entries(addons)) {
    const pricePerUnit = ADDON_PRICES[addonKey as keyof typeof ADDON_PRICES];
    if (pricePerUnit) {
      total += pricePerUnit * quantity;
    }
  }

  return total;
}

/**
 * Find or create a Stripe product for an add-on.
 * Searches by metadata first; creates if not found.
 */
async function getOrCreateAddonProduct(addonKey: string): Promise<string> {

  // Search for existing product with matching metadata
  const existingProducts = await stripe.products.search({
    query: `metadata['addon_key']:'${addonKey}' AND active:'true'`,
    limit: 1,
  });

  if (existingProducts.data.length > 0) {
    return existingProducts.data[0].id;
  }

  // Create new product in Stripe
  const displayName = ADDON_DISPLAY_NAMES[addonKey] || `Add-on: ${addonKey}`;
  const product = await stripe.products.create({
    name: `Quimera Add-on: ${displayName}`,
    description: `Add-on recurrente para agencias - ${displayName}`,
    metadata: {
      addon_key: addonKey,
      type: 'addon',
    },
  });

  functions.logger.info('Created Stripe product for add-on', {
    addonKey,
    productId: product.id,
  });

  return product.id;
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * Get available add-ons and pricing
 */
export const getAddonsPricing = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId } = data;
  await verifyAgencyOwner(userId, tenantId);

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Tenant not found');
  }

  const tenantData = tenantDoc.data()!;
  const currentAddons = tenantData.billing?.addons || {};

  return {
    success: true,
    availableAddons: [
      {
        id: 'extraSubClients',
        name: 'Sub-clientes Adicionales',
        description: 'Aumenta el límite de sub-clientes',
        pricePerUnit: ADDON_PRICES.extraSubClients,
        unit: 'cliente',
        currentQuantity: currentAddons.extraSubClients || 0,
      },
      {
        id: 'extraStorageGB',
        name: 'Almacenamiento Extra',
        description: 'Espacio adicional en bloques de 100GB',
        pricePerUnit: ADDON_PRICES.extraStorageGB,
        unit: '100GB',
        currentQuantity: currentAddons.extraStorageGB || 0,
      },
      {
        id: 'extraAiCredits',
        name: 'AI Credits Extra',
        description: 'Créditos adicionales en bloques de 1000',
        pricePerUnit: ADDON_PRICES.extraAiCredits,
        unit: '1000 credits',
        currentQuantity: currentAddons.extraAiCredits || 0,
      },
    ],
    currentMonthlyPrice: tenantData.billing?.addonsMonthlyPrice || 0,
  };
});

/**
 * Calculate add-ons price
 */
export const calculateAddonsPrice = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { addons } = data;

  if (!addons || typeof addons !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid addons data');
  }

  const totalPrice = calculateTotalAddonsPrice(addons);

  return {
    success: true,
    totalMonthlyPrice: totalPrice,
    breakdown: Object.entries(addons).map(([key, quantity]) => ({
      addon: key,
      quantity,
      pricePerUnit: ADDON_PRICES[key as keyof typeof ADDON_PRICES],
      total: ADDON_PRICES[key as keyof typeof ADDON_PRICES] * (quantity as number),
    })),
  };
});

/**
 * Check if tenant is eligible for add-ons
 */
export const checkAddonsEligibility = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId } = data;
  await verifyAgencyOwner(userId, tenantId);

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Tenant not found');
  }

  const tenantData = tenantDoc.data()!;
  const plan = tenantData.subscriptionPlan;

  // Add-ons available for all agency plans (current + legacy) and enterprise
  const isEligible = ADDON_ELIGIBLE_PLANS.includes(plan);

  return {
    success: true,
    isEligible,
    plan,
    reason: isEligible ? null : 'Add-ons are only available for Agency plans (Starter, Pro, Scale, or Enterprise)',
  };
});

/**
 * Update subscription add-ons
 */
export const updateSubscriptionAddons = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tenantId, addons } = data;

  if (!addons || typeof addons !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid addons data');
  }

  await verifyAgencyOwner(userId, tenantId);

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Tenant not found');
  }

  const tenantData = tenantDoc.data()!;

  // Calculate new add-ons price
  const addonsCost = calculateTotalAddonsPrice(addons);

  try {
    // If tenant has Stripe subscription, update it
    const subscriptionId = tenantData.billing?.stripeSubscriptionId;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Create invoice items for add-ons (proration will be automatic)
      const items: Stripe.SubscriptionUpdateParams.Item[] = [];

      // Keep base subscription item
      items.push({
        id: subscription.items.data[0].id,
      });

      // Remove existing add-on items (items beyond the first/base one)
      for (let i = 1; i < subscription.items.data.length; i++) {
        items.push({
          id: subscription.items.data[i].id,
          deleted: true,
        });
      }

      // Add new add-on items
      for (const [addonKey, qty] of Object.entries(addons)) {
        const quantityNum = qty as number;
        if (quantityNum > 0) {
          const pricePerUnit = ADDON_PRICES[addonKey as keyof typeof ADDON_PRICES];
          if (!pricePerUnit) continue;

          // Find or create the Stripe product for this add-on
          const productId = await getOrCreateAddonProduct(addonKey);

          items.push({
            price_data: {
              currency: 'usd',
              product: productId,
              recurring: { interval: 'month' as const },
              unit_amount: pricePerUnit * 100,
            },
            quantity: quantityNum,
          });
        }
      }

      // Update subscription with new items
      await stripe.subscriptions.update(subscriptionId, {
        items,
        proration_behavior: 'create_prorations',
      });
    }

    // Update Firestore
    await db.collection('tenants').doc(tenantId).update({
      'billing.addons': addons,
      'billing.addonsMonthlyPrice': addonsCost,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record activity
    const agencyTenantId = tenantData.ownerTenantId || tenantId;
    await db.collection('agencyActivity').add({
      agencyTenantId,
      type: 'addons_updated',
      tenantId,
      addons,
      addonsCost,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Add-ons updated successfully', { tenantId, addons, addonsCost });

    return {
      success: true,
      addons,
      newMonthlyPrice: addonsCost,
      totalMonthlyPrice: (tenantData.billing?.monthlyPrice || 0) + addonsCost,
    };
  } catch (error: any) {
    functions.logger.error('Error updating add-ons', { error: error.message, tenantId });
    throw new functions.https.HttpsError('internal', `Failed to update add-ons: ${error.message}`);
  }
});
