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
 * Purchase a domain (Legacy - direct purchase without payment)
 * @deprecated Use createDomainCheckout instead for paid purchases
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

// =============================================================================
// STRIPE CHECKOUT FLOW
// =============================================================================

export interface DomainCheckoutResult {
    sessionId: string;
    url: string;
    orderId: string;
}

export interface DomainOrderStatus {
    status: 'pending_payment' | 'registering' | 'configuring_dns' | 'updating_nameservers' | 'completed' | 'failed';
    step?: string;
    domainName: string;
    error?: string;
    nameservers?: string[];
}

/**
 * Create a Stripe checkout session for domain purchase
 * This is the recommended method for purchasing domains
 */
export async function createDomainCheckout(
    domainName: string,
    price: number,
    years: number = 1
): Promise<DomainCheckoutResult> {
    try {
        const functions = await getFunctionsInstance();
        const checkoutFn = httpsCallable<
            { domainName: string; price: number; years: number; successUrl: string; cancelUrl: string },
            DomainCheckoutResult
        >(functions, 'domains-createDomainCheckoutSession');

        const successUrl = `${window.location.origin}/dashboard?domain_success=true`;
        const cancelUrl = `${window.location.origin}/dashboard?domain_cancel=true`;

        const result = await checkoutFn({ 
            domainName, 
            price, 
            years,
            successUrl,
            cancelUrl
        });

        return result.data;

    } catch (error: any) {
        console.error('[NameComService] Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
    }
}

/**
 * Check the status of a domain order
 */
export async function checkDomainOrderStatus(orderId: string): Promise<DomainOrderStatus> {
    try {
        const functions = await getFunctionsInstance();
        const statusFn = httpsCallable<{ orderId: string }, DomainOrderStatus>(
            functions,
            'domains-checkDomainOrderStatus'
        );

        const result = await statusFn({ orderId });
        return result.data;

    } catch (error: any) {
        console.error('[NameComService] Check status error:', error);
        throw new Error(error.message || 'Failed to check order status');
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








