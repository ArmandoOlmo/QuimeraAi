/**
 * Cloud Functions for Quimera AI
 * Entry point for all Firebase Cloud Functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// ============================================================================
// REPORT FUNCTIONS
// ============================================================================
export {
    generateConsolidatedReport,
    getSavedReport,
    deleteSavedReport,
} from './reports/generateConsolidatedReport';

export {
    sendMonthlyReports,
    sendWeeklyReports,
    triggerManualReport,
} from './reports/scheduledReports';

// ============================================================================
// BILLING FUNCTIONS (Stripe Connect)
// ============================================================================
export {
    createStripeConnectAccount,
    getStripeConnectStatus,
    setupClientBilling,
    updateClientMonthlyPrice,
    cancelClientSubscription,
    generateClientInvoice,
} from './billing/stripeConnectAgency';

export {
    stripeConnectWebhook,
} from './billing/stripeWebhooks';

export {
    updateSubscriptionAddons,
    getAddonsPricing,
    calculateAddonsPrice,
    checkAddonsEligibility,
} from './billing/addonsManagement';

export {
    createOrUpdatePlan,
    archivePlan,
    createCheckoutSession,
    createCustomerPortalSession,
} from './billing/stripePlansManagement';

// ============================================================================
// ONBOARDING FUNCTIONS
// ============================================================================
export {
    autoProvisionClient,
    getOnboardingStatus,
} from './onboarding/autoProvisionClient';

// ============================================================================
// API FUNCTIONS
// ============================================================================
export { tenantsApi } from './api/v1/tenants';

// Export other functions can be added here as they are created
// e.g., permission templates, etc.
