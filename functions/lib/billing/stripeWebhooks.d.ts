/**
 * Stripe Webhooks Handler
 * Handle Stripe events for Connect and subscriptions
 */
import * as functions from 'firebase-functions';
/**
 * Stripe webhook endpoint for Connect accounts
 */
export declare const stripeConnectWebhook: functions.HttpsFunction;
