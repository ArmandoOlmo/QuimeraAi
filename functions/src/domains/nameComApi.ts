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

const db = admin.firestore();

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

    // Generate domain variations to check
    const tlds = ['.com', '.io', '.co', '.app', '.dev', '.net', '.org', '.shop', '.store', '.online'];
    const prefixes = ['', 'get', 'try', 'use', 'my', 'the'];
    
    const domainsToCheck: string[] = [];
    
    // Add variations
    for (const prefix of prefixes) {
        for (const tld of tlds) {
            const domain = `${prefix}${cleanKeyword}${tld}`;
            if (domain.length <= 63 && !domainsToCheck.includes(domain)) {
                domainsToCheck.push(domain);
            }
            if (domainsToCheck.length >= 30) break;
        }
        if (domainsToCheck.length >= 30) break;
    }

    try {
        const result = await nameComRequest<DomainSearchResult>(
            '/domains:checkAvailability',
            'POST',
            { domainNames: domainsToCheck }
        );

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
            }))
            .sort((a, b) => (a.price || 999) - (b.price || 999));

        const unavailableDomains = result.results
            .filter(d => !d.purchasable)
            .map(domain => ({
                name: domain.domainName,
                available: false,
                price: null,
                premium: false
            }));

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

