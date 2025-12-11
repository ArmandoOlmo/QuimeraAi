/**
 * Cloud Functions for Quimera AI
 * 
 * Export all cloud functions here.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (must be done before importing other modules)
if (!admin.apps.length) {
    admin.initializeApp();
}

import { getWidgetConfig, submitWidgetLead, trackWidgetAnalytics } from './widgetApi';
import { generateContent, streamContent, getUsageStats, generateImage } from './geminiProxy';
import { 
    createPaymentIntent, 
    createCheckoutSession, 
    stripeWebhook, 
    createRefund, 
    getPaymentStatus 
} from './stripeApi';

import {
    createConnectAccount,
    createConnectOnboardingLink,
    createConnectLoginLink,
    getConnectAccountStatus,
    createConnectPaymentIntent,
    stripeConnectWebhook,
    disconnectConnectAccount
} from './stripeConnect';

import {
    onProductWrite,
    onCategoryWrite,
    onDiscountWrite,
    onOrderCreate,
    onOrderUpdate,
    onStoreSettingsWrite,
    onProductUpdateCheckStock,
    validateDiscount,
    trackOrder
} from './ecommerceSync';

import {
    onReviewWrite,
    onPublicReviewWrite,
    cleanupOldPendingReviews,
    getReviewStats,
    checkVerifiedPurchase
} from './reviewsSync';

import {
    createStoreUser,
    updateStoreUserRole,
    updateStoreUserStatus,
    resetStoreUserPassword,
    deleteStoreUser,
    recordStoreUserLogin,
    getStoreUser,
    onStoreUserCreate,
    onOrderCreateUpdateStoreUser
} from './storeUsersAuth';

// Email functions
import {
    onLeadCreatedSendEmail,
    onLeadScoreUpdate
} from './email/triggers/leadTriggers';

import {
    sendCampaign,
    sendCampaignToSegment,
    processScheduledCampaigns,
    sendTestEmail
} from './email/marketing/campaignService';

// Domain management functions
import {
    addCustomDomain,
    removeCustomDomain,
    updateDomainStatus,
    verifyDomainDNS,
    checkDomainSSL,
    onDomainCreate,
    onDomainDelete,
    scheduledDNSCheck,
    // Name.com Reseller API
    checkDomainAvailability,
    searchDomainSuggestions,
    purchaseDomain,
    getDomainPricing
} from './domains';

// Export widget API functions
export const widget = {
    getConfig: getWidgetConfig,
    submitLead: submitWidgetLead,
    trackAnalytics: trackWidgetAnalytics
};

// Export Gemini proxy functions
export const gemini = {
    generate: generateContent,
    stream: streamContent,
    usage: getUsageStats,
    image: generateImage
};

// Export Stripe/Ecommerce functions
export const stripe = {
    createPaymentIntent,
    createCheckoutSession,
    webhook: stripeWebhook,
    createRefund,
    getPaymentStatus
};

// Export Stripe Connect functions (Multi-tenant)
export const stripeConnect = {
    createAccount: createConnectAccount,
    createOnboardingLink: createConnectOnboardingLink,
    createLoginLink: createConnectLoginLink,
    getAccountStatus: getConnectAccountStatus,
    createPaymentIntent: createConnectPaymentIntent,
    webhook: stripeConnectWebhook,
    disconnect: disconnectConnectAccount
};

// Export Ecommerce Sync functions (Firestore triggers)
export const ecommerce = {
    onProductWrite,
    onCategoryWrite,
    onDiscountWrite,
    onOrderCreate,
    onOrderUpdate,
    onStoreSettingsWrite,
    validateDiscount,
    trackOrder
};

// Export Reviews functions
export const reviews = {
    onReviewWrite,
    onPublicReviewWrite,
    cleanupOldPendingReviews,
    getReviewStats,
    checkVerifiedPurchase
};

// Export Store Users Auth functions (Multi-tenant customer auth)
export const storeUsers = {
    create: createStoreUser,
    updateRole: updateStoreUserRole,
    updateStatus: updateStoreUserStatus,
    resetPassword: resetStoreUserPassword,
    delete: deleteStoreUser,
    recordLogin: recordStoreUserLogin,
    get: getStoreUser,
    onUserCreate: onStoreUserCreate,
    onOrderCreate: onOrderCreateUpdateStoreUser
};

// Export Email functions
export const email = {
    // Lead triggers
    onLeadCreatedSendEmail,
    onLeadScoreUpdate,
    // Marketing/Campaigns
    sendCampaign,
    sendCampaignToSegment,
    processScheduledCampaigns,
    sendTestEmail,
    // Stock alert (from ecommerceSync)
    onProductUpdateCheckStock
};

// Export Domain Management functions
export const domains = {
    add: addCustomDomain,
    remove: removeCustomDomain,
    updateStatus: updateDomainStatus,
    verifyDNS: verifyDomainDNS,
    checkSSL: checkDomainSSL,
    // Triggers
    onDomainCreate,
    onDomainDelete,
    scheduledDNSCheck,
    // Name.com Reseller API
    checkAvailability: checkDomainAvailability,
    searchSuggestions: searchDomainSuggestions,
    purchase: purchaseDomain,
    getPricing: getDomainPricing
};

// Alternative flat exports for easier routing
export { 
    getWidgetConfig, 
    submitWidgetLead, 
    trackWidgetAnalytics,
    generateContent,
    streamContent,
    getUsageStats,
    generateImage,
    // Stripe exports
    createPaymentIntent,
    createCheckoutSession,
    stripeWebhook,
    createRefund,
    getPaymentStatus,
    // Stripe Connect exports (Multi-tenant)
    createConnectAccount,
    createConnectOnboardingLink,
    createConnectLoginLink,
    getConnectAccountStatus,
    createConnectPaymentIntent,
    stripeConnectWebhook,
    disconnectConnectAccount,
    // Ecommerce sync exports
    onProductWrite,
    onCategoryWrite,
    onDiscountWrite,
    onOrderCreate,
    onOrderUpdate,
    onStoreSettingsWrite,
    onProductUpdateCheckStock,
    validateDiscount,
    trackOrder,
    // Reviews exports
    onReviewWrite,
    onPublicReviewWrite,
    cleanupOldPendingReviews,
    getReviewStats,
    checkVerifiedPurchase,
    // Email exports
    onLeadCreatedSendEmail,
    onLeadScoreUpdate,
    sendCampaign,
    sendCampaignToSegment,
    processScheduledCampaigns,
    sendTestEmail,
    // Store Users Auth exports
    createStoreUser,
    updateStoreUserRole,
    updateStoreUserStatus,
    resetStoreUserPassword,
    deleteStoreUser,
    recordStoreUserLogin,
    getStoreUser,
    onStoreUserCreate,
    onOrderCreateUpdateStoreUser,
    // Domain management exports
    addCustomDomain,
    removeCustomDomain,
    updateDomainStatus,
    verifyDomainDNS,
    checkDomainSSL,
    onDomainCreate,
    onDomainDelete,
    scheduledDNSCheck,
    // Name.com Reseller API exports
    checkDomainAvailability,
    searchDomainSuggestions,
    purchaseDomain,
    getDomainPricing
};

