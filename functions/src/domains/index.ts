/**
 * Domain Management Cloud Functions
 * 
 * Functions for managing custom domains:
 * - DNS verification
 * - Domain registration/removal
 * - SSL status monitoring
 * - Name.com Reseller API integration
 * - Cloudflare DNS API integration
 */

export { 
    addCustomDomain, 
    removeCustomDomain, 
    updateDomainStatus, 
    syncDomainMapping,
    setupExternalDomainWithCloudflare,
    verifyExternalDomainNameservers,
    migrateToCloudflare
} from './domainManager';
export { verifyDomainDNS, checkDomainSSL } from './dnsVerification';
export { onDomainCreate, onDomainDelete, scheduledDNSCheck } from './domainTriggers';

// Name.com Reseller API
export { 
    checkDomainAvailability, 
    searchDomainSuggestions, 
    purchaseDomain,
    getDomainPricing,
    createDomainCheckoutSession,
    checkDomainOrderStatus,
    registerDomainAfterPayment
} from './nameComApi';

// Cloudflare DNS API
export {
    setupDomainDNS,
    getDomainDNSStatus
} from './cloudflareApi';

// Cloudflare Worker API (for automatic domain routing)
export { addWorkerDomain } from './cloudflareWorkerApi';








