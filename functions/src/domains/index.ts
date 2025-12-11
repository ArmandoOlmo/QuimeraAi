/**
 * Domain Management Cloud Functions
 * 
 * Functions for managing custom domains:
 * - DNS verification
 * - Domain registration/removal
 * - SSL status monitoring
 * - Name.com Reseller API integration
 */

export { addCustomDomain, removeCustomDomain, updateDomainStatus } from './domainManager';
export { verifyDomainDNS, checkDomainSSL } from './dnsVerification';
export { onDomainCreate, onDomainDelete, scheduledDNSCheck } from './domainTriggers';

// Name.com Reseller API
export { 
    checkDomainAvailability, 
    searchDomainSuggestions, 
    purchaseDomain,
    getDomainPricing 
} from './nameComApi';

