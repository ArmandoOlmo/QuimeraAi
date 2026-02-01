/**
 * Add-ons Management
 * Manage subscription add-ons for agency plans
 */
import * as functions from 'firebase-functions';
/**
 * Update Subscription Add-ons
 * Updates the tenant's subscription with new add-ons
 */
export declare const updateSubscriptionAddons: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Get Add-ons Pricing Info
 * Returns pricing information for all available add-ons
 */
export declare const getAddonsPricing: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Calculate Add-ons Cost
 * Helper function to calculate cost without updating subscription
 */
export declare const calculateAddonsPrice: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Check Add-ons Eligibility
 * Verify if a tenant is eligible to use add-ons
 */
export declare const checkAddonsEligibility: functions.HttpsFunction & functions.Runnable<any>;
