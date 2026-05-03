/**
 * Name.com Service
 * 
 * Client-side service for interacting with Name.com domain registration
 * via Cloud Functions (for security - API keys stay on server).
 */



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
        const { supabase } = await import('../supabase');
        const result = await supabase.functions.invoke('onboarding-api', {
            body: { action: 'domains-searchSuggestions', keyword }
        });
        
        if (result.error) throw result.error;
        return result.data?.data || result.data;

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
        const { supabase } = await import('../supabase');
        const result = await supabase.functions.invoke('onboarding-api', {
            body: { action: 'domains-checkAvailability', domains }
        });

        if (result.error) throw result.error;
        return result.data?.data || result.data;

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
        const { supabase } = await import('../supabase');
        const result = await supabase.functions.invoke('onboarding-api', {
            body: { action: 'domains-purchase', domainName, years, contactInfo }
        });

        if (result.error) throw result.error;
        return result.data?.data || result.data;

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
        const { supabase } = await import('../supabase');
        const successUrl = `${window.location.origin}/dashboard?domain_success=true`;
        const cancelUrl = `${window.location.origin}/dashboard?domain_cancel=true`;

        const result = await supabase.functions.invoke('onboarding-api', {
            body: {
                action: 'domains-createDomainCheckoutSession',
                domainName,
                price,
                years,
                successUrl,
                cancelUrl
            }
        });

        if (result.error) throw result.error;
        return result.data?.data || result.data;

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
        const { supabase } = await import('../supabase');
        const result = await supabase.functions.invoke('onboarding-api', {
            body: { action: 'domains-checkDomainOrderStatus', orderId }
        });

        if (result.error) throw result.error;
        return result.data?.data || result.data;

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
        const { supabase } = await import('../supabase');
        const result = await supabase.functions.invoke('onboarding-api', {
            body: { action: 'domains-getPricing' }
        });

        if (result.error) throw result.error;
        const data = result.data?.data || result.data;
        return data.pricing;

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








