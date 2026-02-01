/**
 * Stripe Plans Management
 * Cloud Functions for managing subscription plans in Stripe
 * Handles Products, Prices, and synchronization with Firestore
 */
import * as functions from 'firebase-functions';
/**
 * Create or update a subscription plan in Stripe
 * - Creates/updates Stripe Product
 * - Creates new Prices (Stripe prices are immutable, so we create new ones)
 * - Updates Firestore with Stripe IDs
 */
export declare const createOrUpdatePlan: functions.HttpsFunction;
/**
 * Archive a plan in Stripe (deactivate product and prices)
 */
export declare const archivePlan: functions.HttpsFunction;
/**
 * Create a Stripe Checkout session for a subscription
 */
export declare const createCheckoutSession: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export declare const createCustomerPortalSession: functions.HttpsFunction & functions.Runnable<any>;
