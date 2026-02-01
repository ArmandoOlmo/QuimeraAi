"use strict";
/**
 * Add-ons Management
 * Manage subscription add-ons for agency plans
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
exports.checkAddonsEligibility = exports.calculateAddonsPrice = exports.getAddonsPricing = exports.updateSubscriptionAddons = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const db = admin.firestore();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
// ============================================================================
// CONSTANTS
// ============================================================================
const ADDON_PRICING = {
    extraSubClients: 15, // $15 per additional sub-client
    extraStorageGB: 0.1, // $0.10 per GB (sold in 100GB blocks)
    extraAiCredits: 0.02, // $0.02 per credit (sold in 1000 credit blocks)
};
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Verify user can manage billing for the tenant
 */
async function verifyCanManageBilling(userId, tenantId) {
    const memberDoc = await db
        .collection('tenantMembers')
        .doc(`${tenantId}_${userId}`)
        .get();
    if (!memberDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'You are not a member of this tenant');
    }
    const memberData = memberDoc.data();
    const allowedRoles = ['owner', 'agency_owner', 'admin'];
    if (!allowedRoles.includes(memberData?.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only owners and admins can manage billing');
    }
    return true;
}
/**
 * Calculate total add-ons cost
 */
function calculateAddonsCost(addons) {
    let total = 0;
    if (addons.extraSubClients) {
        total += addons.extraSubClients * ADDON_PRICING.extraSubClients;
    }
    if (addons.extraStorageGB) {
        // Storage is sold in 100GB blocks at $10 each
        const blocks = Math.ceil(addons.extraStorageGB / 100);
        total += blocks * 10;
    }
    if (addons.extraAiCredits) {
        // Credits are sold in 1000 credit blocks at $20 each
        const blocks = Math.ceil(addons.extraAiCredits / 1000);
        total += blocks * 20;
    }
    return total;
}
/**
 * Get effective limits with add-ons applied
 */
function getEffectiveLimits(baseLimits, addons) {
    return {
        ...baseLimits,
        maxSubClients: (baseLimits.maxSubClients || 0) + (addons.extraSubClients || 0),
        maxStorageGB: (baseLimits.maxStorageGB || 0) + (addons.extraStorageGB || 0),
        maxAiCredits: (baseLimits.maxAiCredits || 0) + (addons.extraAiCredits || 0),
    };
}
// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================
/**
 * Update Subscription Add-ons
 * Updates the tenant's subscription with new add-ons
 */
exports.updateSubscriptionAddons = functions.https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const { tenantId, addons } = data;
    if (!tenantId || !addons) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }
    try {
        // 2. Verify permissions
        await verifyCanManageBilling(userId, tenantId);
        // 3. Get tenant data
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant not found');
        }
        const tenantData = tenantDoc.data();
        // 4. Verify tenant has an agency plan
        if (!['agency', 'agency_plus', 'enterprise'].includes(tenantData?.subscriptionPlan)) {
            throw new functions.https.HttpsError('failed-precondition', 'Add-ons are only available for agency plans');
        }
        // 5. Calculate new add-ons cost
        const addonsMonthlyPrice = calculateAddonsCost(addons);
        // 6. Update Stripe subscription (if exists)
        const stripeSubscriptionId = tenantData?.billing?.stripeSubscriptionId;
        if (stripeSubscriptionId) {
            try {
                const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                // Get the base plan item
                const basePlanItem = subscription.items.data[0];
                // Create new subscription items (base plan + add-ons)
                const subscriptionItems = [
                    {
                        id: basePlanItem.id,
                        price: basePlanItem.price.id,
                    },
                ];
                // Add sub-clients addon
                if (addons.extraSubClients && addons.extraSubClients > 0) {
                    subscriptionItems.push({
                        price_data: {
                            currency: 'usd',
                            product: 'addon_extra_subclients',
                            recurring: { interval: 'month' },
                            unit_amount: ADDON_PRICING.extraSubClients * 100,
                        },
                        quantity: addons.extraSubClients,
                    });
                }
                // Add storage addon (in 100GB blocks)
                if (addons.extraStorageGB && addons.extraStorageGB > 0) {
                    const storageBlocks = Math.ceil(addons.extraStorageGB / 100);
                    subscriptionItems.push({
                        price_data: {
                            currency: 'usd',
                            product: 'addon_extra_storage',
                            recurring: { interval: 'month' },
                            unit_amount: 1000, // $10 per 100GB block
                        },
                        quantity: storageBlocks,
                    });
                }
                // Add AI credits addon (in 1000 credit blocks)
                if (addons.extraAiCredits && addons.extraAiCredits > 0) {
                    const creditBlocks = Math.ceil(addons.extraAiCredits / 1000);
                    subscriptionItems.push({
                        price_data: {
                            currency: 'usd',
                            product: 'addon_extra_ai_credits',
                            recurring: { interval: 'month' },
                            unit_amount: 2000, // $20 per 1000 credits
                        },
                        quantity: creditBlocks,
                    });
                }
                // Update subscription
                const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                    items: subscriptionItems,
                    proration_behavior: 'always_invoice',
                });
                console.log(`Updated Stripe subscription ${stripeSubscriptionId} with add-ons`);
            }
            catch (stripeError) {
                console.error('Error updating Stripe subscription:', stripeError);
                // Continue anyway - we'll update Firestore
            }
        }
        // 7. Update Firestore
        const updatedLimits = getEffectiveLimits(tenantData?.limits || {}, addons);
        await db
            .collection('tenants')
            .doc(tenantId)
            .update({
            'billing.addons': addons,
            'billing.addonsMonthlyPrice': addonsMonthlyPrice,
            limits: updatedLimits,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 8. Log activity
        await db.collection('agencyActivity').add({
            agencyTenantId: tenantId,
            type: 'addons_updated',
            metadata: {
                addons,
                addonsMonthlyPrice,
                effectiveLimits: updatedLimits,
            },
            createdBy: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 9. Calculate new total
        const basePlanPrice = tenantData?.billing?.basePlanPrice || 0;
        const newMonthlyTotal = basePlanPrice + addonsMonthlyPrice;
        return {
            success: true,
            newMonthlyTotal,
            addonsMonthlyPrice,
        };
    }
    catch (error) {
        console.error('Error updating subscription add-ons:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to update add-ons: ${error.message}`);
    }
});
/**
 * Get Add-ons Pricing Info
 * Returns pricing information for all available add-ons
 */
exports.getAddonsPricing = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    return {
        pricing: ADDON_PRICING,
        addons: [
            {
                id: 'extraSubClients',
                name: 'Extra Sub-clients',
                description: 'Additional sub-clients you can manage',
                pricePerUnit: ADDON_PRICING.extraSubClients,
                unit: 'client',
                minimumQuantity: 1,
                maximumQuantity: 50,
            },
            {
                id: 'extraStorageGB',
                name: 'Extra Storage',
                description: 'Additional storage space (sold in 100GB blocks)',
                pricePerUnit: ADDON_PRICING.extraStorageGB,
                unit: 'GB',
                blockSize: 100,
                pricePerBlock: 10,
                minimumQuantity: 100,
                maximumQuantity: 5000,
            },
            {
                id: 'extraAiCredits',
                name: 'Extra AI Credits',
                description: 'Additional AI credits (sold in 1000 credit blocks)',
                pricePerUnit: ADDON_PRICING.extraAiCredits,
                unit: 'credit',
                blockSize: 1000,
                pricePerBlock: 20,
                minimumQuantity: 1000,
                maximumQuantity: 100000,
            },
        ],
    };
});
/**
 * Calculate Add-ons Cost
 * Helper function to calculate cost without updating subscription
 */
exports.calculateAddonsPrice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { addons } = data;
    if (!addons) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing addons parameter');
    }
    const cost = calculateAddonsCost(addons);
    return {
        totalCost: cost,
        breakdown: {
            extraSubClients: {
                quantity: addons.extraSubClients || 0,
                pricePerUnit: ADDON_PRICING.extraSubClients,
                total: (addons.extraSubClients || 0) * ADDON_PRICING.extraSubClients,
            },
            extraStorageGB: {
                quantity: addons.extraStorageGB || 0,
                blocks: Math.ceil((addons.extraStorageGB || 0) / 100),
                pricePerBlock: 10,
                total: Math.ceil((addons.extraStorageGB || 0) / 100) * 10,
            },
            extraAiCredits: {
                quantity: addons.extraAiCredits || 0,
                blocks: Math.ceil((addons.extraAiCredits || 0) / 1000),
                pricePerBlock: 20,
                total: Math.ceil((addons.extraAiCredits || 0) / 1000) * 20,
            },
        },
    };
});
/**
 * Check Add-ons Eligibility
 * Verify if a tenant is eligible to use add-ons
 */
exports.checkAddonsEligibility = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { tenantId } = data;
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Tenant not found');
    }
    const tenantData = tenantDoc.data();
    const plan = tenantData?.subscriptionPlan;
    const isEligible = ['agency', 'agency_plus', 'enterprise'].includes(plan);
    return {
        eligible: isEligible,
        currentPlan: plan,
        reason: isEligible
            ? 'Tenant is eligible for add-ons'
            : 'Add-ons are only available for agency plans',
        currentAddons: tenantData?.billing?.addons || {},
        currentAddonsPrice: tenantData?.billing?.addonsMonthlyPrice || 0,
    };
});
//# sourceMappingURL=addonsManagement.js.map