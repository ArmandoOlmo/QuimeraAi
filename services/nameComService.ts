/**
 * Name.com Service
 * 
 * Client-side service for interacting with Name.com domain registration
 * via Cloud Functions (for security - API keys stay on server).
 */

import { getFunctionsInstance } from '../firebase';
import { httpsCallable } from 'firebase/functions';

// =============================================================================
// TYPES
// =============================================================================

export interface DomainAvailabilityResult {
    name: string;
    available: boolean;
    price: number | null;
    renewalPrice: number | null;
    premium: boolean;
    originalPrice?: number;
}

export interface DomainSearchResults {
    available: DomainAvailabilityResult[];
    unavailable: { name: string; available: false; price: null; premium: false }[];
    keyword: string;
}

export interface DomainPurchaseResult {
    success: boolean;
    domainName: string;
    orderId: string;
    expiryDate: string;
    error?: string;
}

export interface TLDPricing {
    tld: string;
    registrationPrice: number | null;
    renewalPrice: number | null;
}

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Search for available domains based on a keyword
 */
export async function searchDomains(keyword: string): Promise<DomainSearchResults> {
    try {
        const functions = await getFunctionsInstance();
        const searchFn = httpsCallable<{ keyword: string }, DomainSearchResults>(
            functions,
            'domains-searchSuggestions'
        );

        const result = await searchFn({ keyword });
        return result.data;

    } catch (error: any) {
        console.error('[NameComService] Search error:', error);
        throw new Error(error.message || 'Failed to search domains');
    }
}

/**
 * Check availability of specific domains
 */
export async function checkAvailability(domains: string[]): Promise<{
    results: Array<{
        domainName: string;
        purchasable: boolean;
        purchasePrice?: number;
        renewalPrice?: number;
        premium?: boolean;
    }>;
}> {
    try {
        const functions = await getFunctionsInstance();
        const checkFn = httpsCallable<{ domains: string[] }, { results: any[] }>(
            functions,
            'domains-checkAvailability'
        );

        const result = await checkFn({ domains });
        return result.data;

    } catch (error: any) {
        console.error('[NameComService] Check availability error:', error);
        throw new Error(error.message || 'Failed to check domain availability');
    }
}

/**
 * Purchase a domain
 */
export async function purchaseDomain(
    domainName: string,
    years: number = 1,
    contactInfo?: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        phone: string;
        email: string;
    }
): Promise<DomainPurchaseResult> {
    try {
        const functions = await getFunctionsInstance();
        const purchaseFn = httpsCallable<
            { domainName: string; years: number; contactInfo?: any },
            DomainPurchaseResult
        >(functions, 'domains-purchase');

        const result = await purchaseFn({ domainName, years, contactInfo });
        return result.data;

    } catch (error: any) {
        console.error('[NameComService] Purchase error:', error);
        return {
            success: false,
            domainName,
            orderId: '',
            expiryDate: '',
            error: error.message || 'Failed to purchase domain'
        };
    }
}

/**
 * Get pricing for common TLDs
 */
export async function getDomainPricing(): Promise<TLDPricing[]> {
    try {
        const functions = await getFunctionsInstance();
        const pricingFn = httpsCallable<{}, { pricing: TLDPricing[] }>(
            functions,
            'domains-getPricing'
        );

        const result = await pricingFn({});
        return result.data.pricing;

    } catch (error: any) {
        console.error('[NameComService] Get pricing error:', error);
        throw new Error(error.message || 'Failed to get domain pricing');
    }
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null): string {
    if (price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
}

/**
 * Validate domain name format
 */
export function isValidDomainName(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Extract TLD from domain name
 */
export function getTLD(domain: string): string {
    const parts = domain.split('.');
    return parts.length > 1 ? `.${parts.slice(1).join('.')}` : '';
}




