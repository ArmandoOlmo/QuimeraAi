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
    sendTestEmail
};

