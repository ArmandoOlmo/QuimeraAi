/**
 * Automated Client Onboarding
 * Provisions new sub-clients with all necessary resources
 */
import * as functions from 'firebase-functions';
/**
 * Auto Provision Client
 * Creates a new sub-client tenant with all initial configuration
 */
export declare const autoProvisionClient: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Get Onboarding Status
 * Check the onboarding progress for a client
 */
export declare const getOnboardingStatus: functions.HttpsFunction & functions.Runnable<any>;
