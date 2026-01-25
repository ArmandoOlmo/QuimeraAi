/**
 * DNS Verification Functions
 * 
 * Verifies DNS records for custom domains using Node.js DNS module.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as dns from 'dns';
import { promisify } from 'util';
import { getCertificateStatus, getCloudRunDomainMappingStatus } from './cloudRunApi';

const db = admin.firestore();

// Promisify DNS functions
const resolve4 = promisify(dns.resolve4);
const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

// Expected DNS values for Cloud Run
const EXPECTED_A_RECORDS = ['216.239.32.21', '216.239.34.21', '216.239.36.21', '216.239.38.21'];
const EXPECTED_CNAME = 'ghs.googlehosted.com';

interface DNSVerificationResult {
    domain: string;
    verified: boolean;
    records: {
        type: 'A' | 'CNAME' | 'TXT';
        expected: string;
        found: string[];
        verified: boolean;
    }[];
    error?: string;
    checkedAt: string;
}

/**
 * Verify DNS records for a domain
 * Can be called directly or via Cloud Function
 */
export const verifyDomainDNS = functions.https.onCall(async (data, context): Promise<DNSVerificationResult> => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    const userId = context.auth.uid;

    if (!domain) {
        throw new functions.https.HttpsError('invalid-argument', 'Domain is required');
    }

    const normalizedDomain = normalizeDomain(domain);

    try {
        // Verify ownership
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Domain not found in your account');
        }

        const domainData = domainDoc.data();
        if (domainData?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this domain');
        }

        // Perform DNS verification
        const result = await performDNSVerification(normalizedDomain, domainData?.verificationToken);

        // Update domain record with results
        const updates: any = {
            dnsVerified: result.verified,
            dnsRecords: result.records.map(r => ({
                type: r.type,
                host: r.type === 'A' ? '@' : (r.type === 'CNAME' ? 'www' : '_quimera-verify'),
                value: r.expected,
                verified: r.verified,
                lastChecked: result.checkedAt
            })),
            lastVerifiedAt: result.checkedAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // If verified, update status
        if (result.verified) {
            updates.status = 'ssl_pending'; // Next step is SSL provisioning
        }

        await db.collection('customDomains').doc(normalizedDomain).update(updates);
        await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).update(updates);

        console.log(`[DNSVerification] ${normalizedDomain}: verified=${result.verified}`);

        return result;

    } catch (error: any) {
        console.error('[DNSVerification] Error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Check SSL status for a domain
 * This would typically integrate with Cloud Run's domain mapping API
 */
export const checkDomainSSL = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { domain } = data;
    const userId = context.auth.uid;

    const normalizedDomain = normalizeDomain(domain);

    try {
        // Verify ownership
        const domainDoc = await db.collection('customDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists || domainDoc.data()?.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Domain not found or not owned by you');
        }

        // In a real implementation, this would check Cloud Run's domain mapping status
        // We now check both Certificate Manager (new) and Cloud Run (legacy)
        const domainData = domainDoc.data();

        if (domainData?.status === 'ssl_pending' || domainData?.sslStatus === 'pending' || domainData?.sslStatus === 'provisioning') {
            console.log(`[SSLCheck] Checking real status for ${normalizedDomain}...`);

            // 1. Check Certificate Manager status
            const certStatus = await getCertificateStatus(normalizedDomain);

            // 2. Check legacy Cloud Run mapping status
            const cloudRunStatus = await getCloudRunDomainMappingStatus(normalizedDomain);

            const isReady = certStatus.ready || cloudRunStatus.ready;
            const currentCertStatus = certStatus.ready ? 'active' : (certStatus.status || cloudRunStatus.certificateStatus || 'provisioning');

            if (isReady) {
                console.log(`[SSLCheck] Domain ${normalizedDomain} is now ACTIVE`);
                const updates = {
                    status: 'active',
                    sslStatus: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('customDomains').doc(normalizedDomain).update(updates);
                await db.collection('users').doc(userId).collection('domains').doc(normalizedDomain).update(updates);

                return { sslStatus: 'active', status: 'active' };
            }

            // If not ready yet, return current status from APIs
            return {
                sslStatus: currentCertStatus.toLowerCase(),
                status: domainData?.status || 'ssl_pending'
            };
        }

        return {
            sslStatus: domainData?.sslStatus || 'pending',
            status: domainData?.status || 'pending'
        };

    } catch (error: any) {
        console.error('[SSLCheck] Error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Perform actual DNS lookup and verification
 */
async function performDNSVerification(domain: string, verificationToken?: string): Promise<DNSVerificationResult> {
    const results: DNSVerificationResult = {
        domain,
        verified: false,
        records: [],
        checkedAt: new Date().toISOString()
    };

    // Check A records
    try {
        const aRecords = await resolve4(domain);
        const aVerified = aRecords.some(ip => EXPECTED_A_RECORDS.includes(ip));
        results.records.push({
            type: 'A',
            expected: EXPECTED_A_RECORDS[0],
            found: aRecords,
            verified: aVerified
        });
    } catch (error: any) {
        results.records.push({
            type: 'A',
            expected: EXPECTED_A_RECORDS[0],
            found: [],
            verified: false
        });
        if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
            console.warn(`[DNS] A record lookup error for ${domain}:`, error.code);
        }
    }

    // Check CNAME for www subdomain
    try {
        const cnameRecords = await resolveCname(`www.${domain}`);
        const cnameVerified = cnameRecords.some(cname =>
            cname.toLowerCase().includes('ghs.googlehosted.com') ||
            cname.toLowerCase().includes('googlehosted.com')
        );
        results.records.push({
            type: 'CNAME',
            expected: EXPECTED_CNAME,
            found: cnameRecords,
            verified: cnameVerified
        });
    } catch (error: any) {
        results.records.push({
            type: 'CNAME',
            expected: EXPECTED_CNAME,
            found: [],
            verified: false
        });
        if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
            console.warn(`[DNS] CNAME lookup error for www.${domain}:`, error.code);
        }
    }

    // Check TXT verification record (optional but recommended)
    if (verificationToken) {
        try {
            const txtRecords = await resolveTxt(`_quimera-verify.${domain}`);
            const flatTxt = txtRecords.flat();
            const expectedTxt = `quimera-verify=${verificationToken}`;
            const txtVerified = flatTxt.some(txt => txt.includes(verificationToken));
            results.records.push({
                type: 'TXT',
                expected: expectedTxt,
                found: flatTxt,
                verified: txtVerified
            });
        } catch (error: any) {
            results.records.push({
                type: 'TXT',
                expected: `quimera-verify=${verificationToken}`,
                found: [],
                verified: false
            });
        }
    }

    // Domain is verified if A record (or CNAME) points to our servers
    const aVerified = results.records.find(r => r.type === 'A')?.verified || false;
    const wwwCnameVerified = results.records.find(r => r.type === 'CNAME')?.verified || false;

    // A record is required for root domain, CNAME for www is optional but nice to have
    results.verified = aVerified || wwwCnameVerified;

    return results;
}

function normalizeDomain(domain: string): string {
    return domain
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('/')[0];
}











