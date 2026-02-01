"use strict";
/**
 * Cloud Functions for Quimera AI
 * Entry point for all Firebase Cloud Functions
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsApi = exports.getOnboardingStatus = exports.autoProvisionClient = exports.createCustomerPortalSession = exports.createCheckoutSession = exports.archivePlan = exports.createOrUpdatePlan = exports.checkAddonsEligibility = exports.calculateAddonsPrice = exports.getAddonsPricing = exports.updateSubscriptionAddons = exports.stripeConnectWebhook = exports.generateClientInvoice = exports.cancelClientSubscription = exports.updateClientMonthlyPrice = exports.setupClientBilling = exports.getStripeConnectStatus = exports.createStripeConnectAccount = exports.triggerManualReport = exports.sendWeeklyReports = exports.sendMonthlyReports = exports.deleteSavedReport = exports.getSavedReport = exports.generateConsolidatedReport = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// ============================================================================
// REPORT FUNCTIONS
// ============================================================================
var generateConsolidatedReport_1 = require("./reports/generateConsolidatedReport");
Object.defineProperty(exports, "generateConsolidatedReport", { enumerable: true, get: function () { return generateConsolidatedReport_1.generateConsolidatedReport; } });
Object.defineProperty(exports, "getSavedReport", { enumerable: true, get: function () { return generateConsolidatedReport_1.getSavedReport; } });
Object.defineProperty(exports, "deleteSavedReport", { enumerable: true, get: function () { return generateConsolidatedReport_1.deleteSavedReport; } });
var scheduledReports_1 = require("./reports/scheduledReports");
Object.defineProperty(exports, "sendMonthlyReports", { enumerable: true, get: function () { return scheduledReports_1.sendMonthlyReports; } });
Object.defineProperty(exports, "sendWeeklyReports", { enumerable: true, get: function () { return scheduledReports_1.sendWeeklyReports; } });
Object.defineProperty(exports, "triggerManualReport", { enumerable: true, get: function () { return scheduledReports_1.triggerManualReport; } });
// ============================================================================
// BILLING FUNCTIONS (Stripe Connect)
// ============================================================================
var stripeConnectAgency_1 = require("./billing/stripeConnectAgency");
Object.defineProperty(exports, "createStripeConnectAccount", { enumerable: true, get: function () { return stripeConnectAgency_1.createStripeConnectAccount; } });
Object.defineProperty(exports, "getStripeConnectStatus", { enumerable: true, get: function () { return stripeConnectAgency_1.getStripeConnectStatus; } });
Object.defineProperty(exports, "setupClientBilling", { enumerable: true, get: function () { return stripeConnectAgency_1.setupClientBilling; } });
Object.defineProperty(exports, "updateClientMonthlyPrice", { enumerable: true, get: function () { return stripeConnectAgency_1.updateClientMonthlyPrice; } });
Object.defineProperty(exports, "cancelClientSubscription", { enumerable: true, get: function () { return stripeConnectAgency_1.cancelClientSubscription; } });
Object.defineProperty(exports, "generateClientInvoice", { enumerable: true, get: function () { return stripeConnectAgency_1.generateClientInvoice; } });
var stripeWebhooks_1 = require("./billing/stripeWebhooks");
Object.defineProperty(exports, "stripeConnectWebhook", { enumerable: true, get: function () { return stripeWebhooks_1.stripeConnectWebhook; } });
var addonsManagement_1 = require("./billing/addonsManagement");
Object.defineProperty(exports, "updateSubscriptionAddons", { enumerable: true, get: function () { return addonsManagement_1.updateSubscriptionAddons; } });
Object.defineProperty(exports, "getAddonsPricing", { enumerable: true, get: function () { return addonsManagement_1.getAddonsPricing; } });
Object.defineProperty(exports, "calculateAddonsPrice", { enumerable: true, get: function () { return addonsManagement_1.calculateAddonsPrice; } });
Object.defineProperty(exports, "checkAddonsEligibility", { enumerable: true, get: function () { return addonsManagement_1.checkAddonsEligibility; } });
var stripePlansManagement_1 = require("./billing/stripePlansManagement");
Object.defineProperty(exports, "createOrUpdatePlan", { enumerable: true, get: function () { return stripePlansManagement_1.createOrUpdatePlan; } });
Object.defineProperty(exports, "archivePlan", { enumerable: true, get: function () { return stripePlansManagement_1.archivePlan; } });
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return stripePlansManagement_1.createCheckoutSession; } });
Object.defineProperty(exports, "createCustomerPortalSession", { enumerable: true, get: function () { return stripePlansManagement_1.createCustomerPortalSession; } });
// ============================================================================
// ONBOARDING FUNCTIONS
// ============================================================================
var autoProvisionClient_1 = require("./onboarding/autoProvisionClient");
Object.defineProperty(exports, "autoProvisionClient", { enumerable: true, get: function () { return autoProvisionClient_1.autoProvisionClient; } });
Object.defineProperty(exports, "getOnboardingStatus", { enumerable: true, get: function () { return autoProvisionClient_1.getOnboardingStatus; } });
// ============================================================================
// API FUNCTIONS
// ============================================================================
var tenants_1 = require("./api/v1/tenants");
Object.defineProperty(exports, "tenantsApi", { enumerable: true, get: function () { return tenants_1.tenantsApi; } });
// Export other functions can be added here as they are created
// e.g., permission templates, etc.
//# sourceMappingURL=index.js.map