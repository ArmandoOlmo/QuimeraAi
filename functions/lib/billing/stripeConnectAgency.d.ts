/**
 * Stripe Connect for Agency Billing
 * Functions to handle agency billing to sub-clients
 */
import * as functions from 'firebase-functions';
/**
 * Create Stripe Connect account for agency
 */
export declare const createStripeConnectAccount: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Get Stripe Connect account status
 */
export declare const getStripeConnectStatus: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Setup billing for a sub-client
 */
export declare const setupClientBilling: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Update client monthly price
 */
export declare const updateClientMonthlyPrice: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Cancel client subscription
 */
export declare const cancelClientSubscription: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Generate invoice for client
 */
export declare const generateClientInvoice: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Calculate total monthly bill for agency
 * @param plan - Agency plan ID
 * @param activeProjects - Number of active billable projects
 */
export declare function calculateAgencyMonthlyBill(plan: string, activeProjects: number): number;
/**
 * Update active projects count for an agency
 * Called when a project is created or deleted
 */
export declare const updateAgencyProjectCount: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Get agency billing summary
 */
export declare const getAgencyBillingSummary: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Firestore trigger: Update agency project count when a project is created/deleted
 * This runs automatically when projects change
 */
export declare const onProjectChangeUpdateAgencyBilling: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
