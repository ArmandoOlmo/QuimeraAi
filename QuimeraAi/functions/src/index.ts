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
import { textToSpeech, getVoices, voiceChat } from './voiceProxy';
import { twilioVoiceWebhook } from './voice/twilioVoice';
import { outboundCall, outboundCallStatus } from './voice/outboundCall';
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
    getBillingMetrics,
    createOrUpdatePlan,
    archivePlan,
    createSubscriptionCheckout,
    updateSubscription,
    cancelSubscription,
    reactivateSubscription,
    getSubscriptionDetails,
} from './stripeBilling';

// Agency Stripe Connect Billing functions
import {
    createStripeConnectAccount,
    getStripeConnectStatus,
    setupClientBilling,
    updateClientMonthlyPrice,
    cancelClientSubscription,
    generateClientInvoice,
    updateAgencyProjectCount,
    getAgencyBillingSummary,
    onTenantProjectChange
} from './billing/stripeConnectAgency';

// Add-ons Management functions
import {
    getAddonsPricing,
    calculateAddonsPrice,
    checkAddonsEligibility,
    updateSubscriptionAddons
} from './billing/addonsManagement';

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

// Email functions - Lead triggers
import {
    onLeadCreatedSendEmail,
    onLeadScoreUpdate
} from './email/triggers/leadTriggers';

// Email functions - User triggers
import {
    onUserCreatedSendWelcomeEmail,
    onUserEmailVerified
} from './email/triggers/userTriggers';

import {
    sendCampaign,
    sendCampaignToSegment,
    processScheduledCampaigns,
    sendTestEmail
} from './email/marketing/campaignService';

import { sendDirectEmail } from './email/marketing/directEmail';

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
    getDomainPricing,
    // Stripe Checkout for domains
    createDomainCheckoutSession,
    checkDomainOrderStatus,
    // Cloudflare DNS API
    setupDomainDNS,
    getDomainDNSStatus,
    // Domain sync for Cloud Run SSR
    syncDomainMapping,
    // Cloudflare Worker API
    addWorkerDomain,
    // External domain setup (simplified flow via Cloudflare)
    setupExternalDomainWithCloudflare,
    verifyExternalDomainNameservers,
    migrateToCloudflare
} from './domains';

// Social Channels functions
import {
    facebookWebhook,
    facebookWebhookVerify,
    facebookMessengerWebhook,
    whatsappWebhook,
    whatsappWebhookVerify,
    instagramWebhook,
    instagramWebhookVerify,
    processIncomingMessage,
    sendOutboundMessage
} from './socialChannels';

// Meta OAuth functions
import {
    metaOAuthCallback,
    metaOAuthInit,
    getMetaConnection,
    disconnectMeta,
    refreshMetaToken,
    getConnectedPages,
    getWhatsAppAccounts,
    selectMetaAssets,
    setupWebhooks
} from './metaOAuth';

// Tenant invites functions
import {
    createTenantInvite,
    acceptTenantInvite,
    acceptTenantInviteByToken,
    cancelTenantInvite,
    resendTenantInvite,
    getInviteByToken,
    cleanupExpiredInvites
} from './tenantInvites';

// Portal domains functions
import {
    addPortalDomain,
    verifyPortalDomain,
    removePortalDomain,
    scheduledPortalDNSCheck
} from './portalDomains';

// User role claims functions (sync roles to Firebase Auth Custom Claims)
import {
    onUserRoleChange,
    syncUserRoleClaims,
    batchSyncAllUserClaims
} from './userRoleClaims';

// Onboarding functions
import { analyzeWebsite } from './onboarding/analyzeWebsite';
import { autoProvisionClient, getOnboardingStatus } from './onboarding/autoProvisionClient';

// Agency project transfer
import { transferProjectToClient } from './agency/transferProjectToClient';

// Knowledge content extraction
import { extractContent } from './extractContent';

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

// Export Voice proxy functions (Google Cloud TTS)
export const voice = {
    tts: textToSpeech,
    voices: getVoices,
    chat: voiceChat
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

// Export Agency Stripe Connect Billing functions
export const agencyBilling = {
    createStripeConnectAccount,
    getStripeConnectStatus,
    setupClientBilling,
    updateClientMonthlyPrice,
    cancelClientSubscription,
    generateClientInvoice,
    updateAgencyProjectCount,
    getAgencyBillingSummary,
    onTenantProjectChange
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
    // User triggers
    onUserCreatedSendWelcomeEmail,
    onUserEmailVerified,
    // Marketing/Campaigns
    sendCampaign,
    sendCampaignToSegment,
    processScheduledCampaigns,
    sendTestEmail,
    // Direct Email
    sendDirectEmail,
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
    getPricing: getDomainPricing,
    // Stripe Checkout for domains
    createDomainCheckoutSession,
    checkDomainOrderStatus,
    // Cloudflare DNS API
    setupDNS: setupDomainDNS,
    getDNSStatus: getDomainDNSStatus,
    // External domain setup (simplified via Cloudflare)
    setupExternalWithCloudflare: setupExternalDomainWithCloudflare,
    verifyExternalNameservers: verifyExternalDomainNameservers,
    migrateToCloudflare
};

// Export Social Channels functions
export const socialChannels = {
    // Facebook Messenger
    facebookWebhook,
    facebookWebhookVerify,
    facebookMessengerWebhook,
    // WhatsApp Business
    whatsappWebhook,
    whatsappWebhookVerify,
    // Instagram DMs
    instagramWebhook,
    instagramWebhookVerify,
    // Message Processing
    processIncomingMessage,
    sendOutboundMessage
};

// Direct export for Facebook Messenger webhook (for Meta integration)
export { facebookMessengerWebhook };

// Export Meta OAuth functions
export const metaOAuth = {
    callback: metaOAuthCallback,
    init: metaOAuthInit,
    getConnection: getMetaConnection,
    disconnect: disconnectMeta,
    refreshToken: refreshMetaToken,
    getPages: getConnectedPages,
    getWhatsAppAccounts: getWhatsAppAccounts,
    selectAssets: selectMetaAssets,
    setupWebhooks: setupWebhooks
};

// Export Tenant Invites functions (Multi-tenant)
export const tenantInvites = {
    create: createTenantInvite,
    accept: acceptTenantInvite,
    acceptByToken: acceptTenantInviteByToken,
    cancel: cancelTenantInvite,
    resend: resendTenantInvite,
    getByToken: getInviteByToken,
    cleanup: cleanupExpiredInvites
};

// Export Portal Domains functions (White-label)
export const portalDomains = {
    add: addPortalDomain,
    verify: verifyPortalDomain,
    remove: removePortalDomain,
    scheduledCheck: scheduledPortalDNSCheck
};

// Export User Role Claims functions (Security - sync roles to Firebase Auth)
export const userRoles = {
    onUserRoleChange,
    syncClaims: syncUserRoleClaims,
    batchSyncAll: batchSyncAllUserClaims
};

// Export Agency Onboarding functions
export const agencyOnboarding = {
    analyzeWebsite,
    autoProvision: autoProvisionClient,
    getStatus: getOnboardingStatus,
    transferProject: transferProjectToClient,
};

// Export Knowledge content extraction
export const knowledge = {
    extractContent,
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
    // Stripe Billing exports
    getBillingMetrics,
    createOrUpdatePlan,
    archivePlan,
    createSubscriptionCheckout,
    updateSubscription,
    cancelSubscription,
    reactivateSubscription,
    getSubscriptionDetails,
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
    // Email exports - Lead triggers
    onLeadCreatedSendEmail,
    onLeadScoreUpdate,
    // Email exports - User triggers
    onUserCreatedSendWelcomeEmail,
    onUserEmailVerified,
    // Email exports - Marketing
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
    getDomainPricing,
    // Stripe Checkout for domains
    createDomainCheckoutSession,
    checkDomainOrderStatus,
    // Cloudflare DNS API
    setupDomainDNS,
    getDomainDNSStatus,
    // Domain sync for Cloud Run SSR
    syncDomainMapping,
    // Cloudflare Worker API
    addWorkerDomain,
    // Social Channels exports
    facebookWebhook,
    facebookWebhookVerify,
    whatsappWebhook,
    whatsappWebhookVerify,
    instagramWebhook,
    instagramWebhookVerify,
    processIncomingMessage,
    sendOutboundMessage,
    // Meta OAuth exports
    metaOAuthCallback,
    metaOAuthInit,
    getMetaConnection,
    disconnectMeta,
    refreshMetaToken,
    getConnectedPages,
    getWhatsAppAccounts,
    selectMetaAssets,
    setupWebhooks,
    // Tenant Invites exports (Multi-tenant)
    createTenantInvite,
    acceptTenantInvite,
    acceptTenantInviteByToken,
    cancelTenantInvite,
    resendTenantInvite,
    getInviteByToken,
    cleanupExpiredInvites,
    // Portal Domains exports (White-label)
    addPortalDomain,
    verifyPortalDomain,
    removePortalDomain,
    scheduledPortalDNSCheck,
    // Voice proxy exports (Google Cloud TTS)
    textToSpeech,
    getVoices,
    voiceChat,
    // User Role Claims exports (Security)
    onUserRoleChange,
    syncUserRoleClaims,
    batchSyncAllUserClaims,
    // Agency Stripe Connect Billing exports
    createStripeConnectAccount,
    getStripeConnectStatus,
    setupClientBilling,
    updateClientMonthlyPrice,
    cancelClientSubscription,
    generateClientInvoice,
    updateAgencyProjectCount,
    getAgencyBillingSummary,
    onTenantProjectChange,
    // Add-ons Management exports
    getAddonsPricing,
    calculateAddonsPrice,
    checkAddonsEligibility,
    updateSubscriptionAddons,
    // Agency Project Transfer
    transferProjectToClient
};

// Knowledge content extraction exports
export { extractContent };

// Direct export for Twilio Voice Webhook (ElevenLabs Conversational AI)
export { twilioVoiceWebhook };


// Outbound call functions (Quibo initiates calls via ElevenLabs)
export { outboundCall, outboundCallStatus };
