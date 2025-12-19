/**
 * Name.com Reseller API Integration
 * 
 * Cloud Functions for domain search, availability check, and registration
 * via Name.com's Reseller API.
 * 
 * API Docs: https://www.name.com/api-docs
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

// Initialize Stripe
const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key;
    if (!secretKey) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia' as any,
    });
};

// Name.com API Configuration
const NAME_COM_API_URL = 'https://api.name.com/v4';
const NAME_COM_DEV_API_URL = 'https://api.dev.name.com/v4'; // For testing

// Get credentials from environment/config
function getNameComCredentials(): { username: string; token: string; isDev: boolean } {
    const config = functions.config();
    return {
        username: config.namecom?.username || process.env.NAME_COM_USERNAME || '',
        token: config.namecom?.token || process.env.NAME_COM_TOKEN || '',
        isDev: config.namecom?.environment === 'development' || process.env.NAME_COM_ENV === 'development'
    };
}

function getApiUrl(isDev: boolean): string {
    return isDev ? NAME_COM_DEV_API_URL : NAME_COM_API_URL;
}

// =============================================================================
// TYPES
// =============================================================================

interface DomainAvailability {
    domainName: string;
    purchasable: boolean;
    purchasePrice?: number;
    purchaseType?: string;
    renewalPrice?: number;
    premium?: boolean;
}

interface DomainSearchResult {
    results: DomainAvailability[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function nameComRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
): Promise<T> {
    const { username, token, isDev } = getNameComCredentials();
    
    if (!username || !token) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Name.com API credentials not configured'
        );
    }

    const url = `${getApiUrl(isDev)}${endpoint}`;
    const auth = Buffer.from(`${username}:${token}`).toString('base64');

    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(`[Name.com] API Error: ${response.status}`, error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || `Name.com API error: ${response.status}`
        );
    }

    return response.json();
}

// =============================================================================
// CLOUD FUNCTIONS
// =============================================================================

/**
 * Check domain availability
 * Can check up to 50 domains at once
 */
export const checkDomainAvailability = functions.https.onCall(async (data, context) => {
    // Optional: require authentication
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    // }

    const { domains } = data;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'domains array is required');
    }

    if (domains.length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Maximum 50 domains per request');
    }

    try {
        const result = await nameComRequest<DomainSearchResult>(
            '/domains:checkAvailability',
            'POST',
            { domainNames: domains }
        );

        // Add margin to prices for reselling
        const MARGIN_PERCENTAGE = 0.20; // 20% margin
        
        const resultsWithMargin = result.results.map(domain => ({
            ...domain,
            // Store original price for our records
            originalPrice: domain.purchasePrice,
            // Add margin for customer price
            purchasePrice: domain.purchasePrice 
                ? Math.ceil(domain.purchasePrice * (1 + MARGIN_PERCENTAGE) * 100) / 100
                : undefined,
            renewalPrice: domain.renewalPrice
                ? Math.ceil(domain.renewalPrice * (1 + MARGIN_PERCENTAGE) * 100) / 100
                : undefined,
        }));

        return { results: resultsWithMargin };

    } catch (error: any) {
        console.error('[Name.com] Check availability error:', error);
        throw error instanceof functions.https.HttpsError 
            ? error 
            : new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Search for domain suggestions based on keyword
 */
export const searchDomainSuggestions = functions.https.onCall(async (data, context) => {
    const { keyword } = data;

    if (!keyword || typeof keyword !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'keyword is required');
    }

    // Clean keyword
    const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Priority TLDs (always check these first for the base keyword)
    const priorityTlds = ['.com', '.net', '.org', '.io', '.co'];
    const otherTlds = ['.app', '.dev', '.shop', '.store', '.online', '.site', '.tech', '.xyz'];
    const prefixes = ['', 'get', 'try', 'my', 'the'];
    
    const domainsToCheck: string[] = [];
    
    // FIRST: Add base keyword with ALL priority TLDs (these are most important)
    for (const tld of priorityTlds) {
        const domain = `${cleanKeyword}${tld}`;
        if (domain.length <= 63 && !domainsToCheck.includes(domain)) {
            domainsToCheck.push(domain);
        }
    }
    
    // SECOND: Add base keyword with other TLDs
    for (const tld of otherTlds) {
        const domain = `${cleanKeyword}${tld}`;
        if (domain.length <= 63 && !domainsToCheck.includes(domain)) {
            domainsToCheck.push(domain);
        }
    }
    
    // THIRD: Add variations with prefixes (priority TLDs first)
    for (const prefix of prefixes) {
        if (prefix === '') continue; // Already added base keyword
        for (const tld of [...priorityTlds, ...otherTlds]) {
            const domain = `${prefix}${cleanKeyword}${tld}`;
            if (domain.length <= 63 && !domainsToCheck.includes(domain)) {
                domainsToCheck.push(domain);
            }
            if (domainsToCheck.length >= 50) break; // Increased limit
        }
        if (domainsToCheck.length >= 50) break;
    }

    console.log(`[Name.com] Checking ${domainsToCheck.length} domains for keyword: ${cleanKeyword}`);
    console.log('[Name.com] Domains to check:', domainsToCheck.slice(0, 10)); // Log first 10

    try {
        const result = await nameComRequest<DomainSearchResult>(
            '/domains:checkAvailability',
            'POST',
            { domainNames: domainsToCheck }
        );

        console.log(`[Name.com] Got ${result.results.length} results from API`);

        // Filter and sort results
        const MARGIN_PERCENTAGE = 0.20;
        
        const availableDomains = result.results
            .filter(d => d.purchasable)
            .map(domain => ({
                name: domain.domainName,
                available: true,
                price: domain.purchasePrice 
                    ? Math.ceil(domain.purchasePrice * (1 + MARGIN_PERCENTAGE) * 100) / 100
                    : null,
                renewalPrice: domain.renewalPrice
                    ? Math.ceil(domain.renewalPrice * (1 + MARGIN_PERCENTAGE) * 100) / 100
                    : null,
                premium: domain.premium || false,
                originalPrice: domain.purchasePrice
            }));

        const unavailableDomains = result.results
            .filter(d => !d.purchasable)
            .map(domain => ({
                name: domain.domainName,
                available: false,
                price: null,
                premium: false
            }));

        console.log(`[Name.com] Available: ${availableDomains.length}, Unavailable: ${unavailableDomains.length}`);

        return {
            available: availableDomains,
            unavailable: unavailableDomains,
            keyword: cleanKeyword
        };

    } catch (error: any) {
        console.error('[Name.com] Search suggestions error:', error);
        throw error instanceof functions.https.HttpsError 
            ? error 
            : new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Purchase/Register a domain
 * Requires authentication
 */
export const purchaseDomain = functions.https.onCall(async (data, context) => {
    // Require authentication for purchases
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to purchase domains');
    }

    const { domainName, years = 1, contactInfo } = data;
    const userId = context.auth.uid;

    if (!domainName || typeof domainName !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'domainName is required');
    }

    if (years < 1 || years > 10) {
        throw new functions.https.HttpsError('invalid-argument', 'years must be between 1 and 10');
    }

    try {
        // First, check availability and get current price
        const availabilityResult = await nameComRequest<DomainSearchResult>(
            '/domains:checkAvailability',
            'POST',
            { domainNames: [domainName] }
        );

        const domainInfo = availabilityResult.results[0];
        
        if (!domainInfo || !domainInfo.purchasable) {
            throw new functions.https.HttpsError('failed-precondition', 'Domain is not available for purchase');
        }

        // Create order record before purchase
        const orderRef = db.collection('domainOrders').doc();
        await orderRef.set({
            id: orderRef.id,
            userId,
            domainName,
            years,
            purchasePrice: domainInfo.purchasePrice,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Register the domain with Name.com
        const registrationData: any = {
            domain: {
                domainName,
            },
            years,
            purchasePrice: domainInfo.purchasePrice,
        };

        // Add contact info if provided
        if (contactInfo) {
            registrationData.domain.contacts = {
                registrant: contactInfo,
                admin: contactInfo,
                tech: contactInfo,
                billing: contactInfo,
            };
        }

        const result = await nameComRequest<any>(
            '/domains',
            'POST',
            registrationData
        );

        // Update order status
        await orderRef.update({
            status: 'completed',
            nameComResponse: result,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Add domain to user's domains collection
        const userDomainRef = db.collection('users').doc(userId).collection('domains').doc(domainName);
        await userDomainRef.set({
            id: domainName,
            name: domainName,
            status: 'active',
            provider: 'Quimera',
            purchasedVia: 'Name.com',
            purchasePrice: domainInfo.purchasePrice,
            years,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiryDate: new Date(Date.now() + (years * 365 * 24 * 60 * 60 * 1000)).toISOString(),
            orderId: orderRef.id,
        });

        console.log(`[Name.com] Domain purchased: ${domainName} for user ${userId}`);

        return {
            success: true,
            domainName,
            orderId: orderRef.id,
            expiryDate: new Date(Date.now() + (years * 365 * 24 * 60 * 60 * 1000)).toISOString(),
        };

    } catch (error: any) {
        console.error('[Name.com] Purchase error:', error);
        
        // Log failed order
        await db.collection('domainOrders').add({
            userId,
            domainName,
            years,
            status: 'failed',
            error: error.message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        throw error instanceof functions.https.HttpsError 
            ? error 
            : new functions.https.HttpsError('internal', `Failed to purchase domain: ${error.message}`);
    }
});

/**
 * Get domain pricing for TLDs
 */
export const getDomainPricing = functions.https.onCall(async (data, context) => {
    try {
        // Name.com doesn't have a direct pricing endpoint, so we check common TLDs
        const sampleDomains = [
            'example-test-domain-12345.com',
            'example-test-domain-12345.io',
            'example-test-domain-12345.co',
            'example-test-domain-12345.app',
            'example-test-domain-12345.dev',
            'example-test-domain-12345.net',
            'example-test-domain-12345.org',
        ];

        const result = await nameComRequest<DomainSearchResult>(
            '/domains:checkAvailability',
            'POST',
            { domainNames: sampleDomains }
        );

        const MARGIN_PERCENTAGE = 0.20;

        const pricing = result.results.map(d => {
            const tld = '.' + d.domainName.split('.').slice(1).join('.');
            return {
                tld,
                registrationPrice: d.purchasePrice 
                    ? Math.ceil(d.purchasePrice * (1 + MARGIN_PERCENTAGE) * 100) / 100
                    : null,
                renewalPrice: d.renewalPrice
                    ? Math.ceil(d.renewalPrice * (1 + MARGIN_PERCENTAGE) * 100) / 100
                    : null,
            };
        });

        return { pricing };

    } catch (error: any) {
        console.error('[Name.com] Get pricing error:', error);
        throw error instanceof functions.https.HttpsError 
            ? error 
            : new functions.https.HttpsError('internal', error.message);
    }
});

// =============================================================================
// STRIPE CHECKOUT FOR DOMAIN PURCHASE
// =============================================================================

/**
 * Creates a Stripe Checkout Session for domain purchase
 * User pays first, then domain is registered via webhook
 */
export const createDomainCheckoutSession = functions.https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to purchase domains');
    }

    const { domainName, years = 1, price, successUrl, cancelUrl } = data;
    const userId = context.auth.uid;

    if (!domainName || typeof domainName !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'domainName is required');
    }

    if (!price || typeof price !== 'number' || price <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid price is required');
    }

    if (!successUrl || !cancelUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'successUrl and cancelUrl are required');
    }

    if (years < 1 || years > 10) {
        throw new functions.https.HttpsError('invalid-argument', 'years must be between 1 and 10');
    }

    try {
        // First verify domain is still available
        const availabilityResult = await nameComRequest<DomainSearchResult>(
            '/domains:checkAvailability',
            'POST',
            { domainNames: [domainName] }
        );

        const domainInfo = availabilityResult.results[0];
        
        if (!domainInfo || !domainInfo.purchasable) {
            throw new functions.https.HttpsError('failed-precondition', 'Domain is no longer available for purchase');
        }

        // Get user info for email
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const userEmail = userData?.email || context.auth.token?.email || '';

        // Create pending order record
        const orderRef = db.collection('domainOrders').doc();
        await orderRef.set({
            id: orderRef.id,
            userId,
            domainName,
            years,
            // Store both prices for records
            customerPrice: price,
            wholesalePrice: domainInfo.purchasePrice,
            profit: price - (domainInfo.purchasePrice || 0),
            status: 'pending_payment',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create Stripe Checkout Session
        const stripe = getStripe();

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Domain: ${domainName}`,
                        description: `${years} year${years > 1 ? 's' : ''} registration`,
                    },
                    unit_amount: Math.round(price * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: userEmail,
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&domain=${encodeURIComponent(domainName)}`,
            cancel_url: cancelUrl,
            metadata: {
                type: 'domain_purchase',
                userId,
                domainName,
                years: years.toString(),
                orderId: orderRef.id,
                wholesalePrice: (domainInfo.purchasePrice || 0).toString(),
            },
        });

        // Update order with session ID
        await orderRef.update({
            stripeSessionId: session.id,
        });

        console.log(`[Domains] Checkout session created for ${domainName}, user ${userId}`);

        return {
            sessionId: session.id,
            url: session.url,
            orderId: orderRef.id,
        };

    } catch (error: any) {
        console.error('[Domains] Checkout session error:', error);
        throw error instanceof functions.https.HttpsError 
            ? error 
            : new functions.https.HttpsError('internal', `Failed to create checkout: ${error.message}`);
    }
});

/**
 * Internal function to register domain after payment (called by webhook)
 */
export async function registerDomainAfterPayment(
    orderId: string,
    domainName: string,
    years: number,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get order details
        const orderRef = db.collection('domainOrders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const orderData = orderDoc.data();

        // Check if already processed
        if (orderData?.status === 'completed') {
            console.log(`[Domains] Order ${orderId} already completed, skipping`);
            return { success: true };
        }

        // Update status to processing
        await orderRef.update({
            status: 'registering',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Register the domain with Name.com
        const registrationData = {
            domain: {
                domainName,
            },
            years,
            purchasePrice: orderData?.wholesalePrice,
        };

        const result = await nameComRequest<any>(
            '/domains',
            'POST',
            registrationData
        );

        // Update order as completed
        await orderRef.update({
            status: 'completed',
            nameComResponse: result,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Add domain to user's domains collection
        const expiryDate = new Date(Date.now() + (years * 365 * 24 * 60 * 60 * 1000)).toISOString();
        
        const userDomainRef = db.collection('users').doc(userId).collection('domains').doc(domainName);
        await userDomainRef.set({
            id: domainName,
            name: domainName,
            status: 'active',
            provider: 'Quimera',
            purchasedVia: 'Name.com',
            purchasePrice: orderData?.customerPrice,
            years,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiryDate,
            orderId,
        });

        console.log(`[Domains] Domain ${domainName} registered successfully for user ${userId}`);

        return { success: true };

    } catch (error: any) {
        console.error('[Domains] Registration error:', error);

        // Update order with error
        await db.collection('domainOrders').doc(orderId).update({
            status: 'failed',
            error: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: false, error: error.message };
    }
}

/**
 * Check order status (for frontend polling after payment)
 */
export const checkDomainOrderStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { orderId } = data;

    if (!orderId) {
        throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
    }

    try {
        const orderDoc = await db.collection('domainOrders').doc(orderId).get();

        if (!orderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found');
        }

        const orderData = orderDoc.data();

        // Verify user owns this order
        if (orderData?.userId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized to view this order');
        }

        return {
            status: orderData?.status,
            domainName: orderData?.domainName,
            error: orderData?.error,
        };

    } catch (error: any) {
        throw error instanceof functions.https.HttpsError 
            ? error 
            : new functions.https.HttpsError('internal', error.message);
    }
});








