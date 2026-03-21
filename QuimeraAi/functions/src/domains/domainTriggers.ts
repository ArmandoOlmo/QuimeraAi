/**
 * Domain Triggers
 * 
 * Firestore triggers and scheduled functions for domain management.
 * 
 * onDomainCreate: AUTO-PROVISIONS SSL certificate when a domain is created
 * scheduledDNSCheck: Safety net that checks/creates missing certs every 5 min
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { setupDomainSSL, checkCertificateStatus } from './gcpCertificateManager';

const db = admin.firestore();

/**
 * Trigger when a new domain is created
 * Sets up initial state and schedules verification
 */
export const onDomainCreate = functions.firestore
    .document('customDomains/{domain}')
    .onCreate(async (snap, context) => {
        const domain = context.params.domain;
        const data = snap.data();

        console.log(`[DomainTrigger] New domain created: ${domain}`);
        console.log(`[DomainTrigger] Data: userId=${data?.userId}, projectId=${data?.projectId}, status=${data?.status}`);

        // ============================================
        // AUTO-PROVISION SSL CERTIFICATE
        // This is the PRIMARY mechanism for SSL setup.
        // Creates a Google-managed cert + cert-map entry
        // in quimera-cert-map for the Load Balancer.
        // ============================================
        try {
            console.log(`[DomainTrigger] === Auto-provisioning SSL for ${domain} ===`);
            const sslResult = await setupDomainSSL(domain);

            if (sslResult.success) {
                console.log(`[DomainTrigger] ✅ SSL setup initiated for ${domain} (cert: ${sslResult.certName}, state: ${sslResult.state})`);

                // Update the customDomains document with cert info
                const certUpdate: any = {
                    sslStatus: 'provisioning',
                    gcpCertName: sslResult.certName,
                    gcpCertState: sslResult.state,
                    sslProvisionedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                await snap.ref.update(certUpdate);

                // Also update the user's domain record if userId is available
                if (data?.userId) {
                    try {
                        await db.collection('users').doc(data.userId)
                            .collection('domains').doc(domain)
                            .update(certUpdate);
                        console.log(`[DomainTrigger] Updated user domain record for ${data.userId}`);
                    } catch (userUpdateErr: any) {
                        // User doc might not exist yet (race condition) — not critical
                        console.warn(`[DomainTrigger] Could not update user domain (non-blocking): ${userUpdateErr.message}`);
                    }
                }
            } else {
                console.error(`[DomainTrigger] ❌ SSL setup failed for ${domain}: ${sslResult.error}`);
                // Mark the error but don't block — scheduledDNSCheck will retry
                await snap.ref.update({
                    sslStatus: 'pending',
                    sslError: sslResult.error,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        } catch (sslError: any) {
            console.error(`[DomainTrigger] ❌ SSL auto-provision error for ${domain}: ${sslError.message}`);
            // Non-blocking — scheduledDNSCheck will retry
            try {
                await snap.ref.update({
                    sslStatus: 'pending',
                    sslError: sslError.message,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } catch (e) {
                // Ignore update errors
            }
        }

        return null;
    });

/**
 * Trigger when a domain is deleted
 * Cleans up associated resources
 */
export const onDomainDelete = functions.firestore
    .document('customDomains/{domain}')
    .onDelete(async (_snap, context) => {
        const domain = context.params.domain;

        console.log(`[DomainTrigger] Domain deleted: ${domain}`);

        // Could trigger cleanup here:
        // - Remove from Cloud Run domain mapping
        // - Clean up SSL certificates
        // - Notify user

        return null;
    });

/**
 * Scheduled function to check DNS for pending domains
 * Runs every 5 minutes
 */
export const scheduledDNSCheck = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
        console.log('[ScheduledDNSCheck] Starting DNS verification check...');

        try {
            // Find domains that need attention:
            // 1. Domains with pending/verifying/ssl_pending status
            // 2. Domains with sslStatus 'pending' or 'provisioning' (even if status is different)
            const [byStatus, bySslStatus] = await Promise.all([
                db.collection('customDomains')
                    .where('status', 'in', ['pending', 'verifying', 'ssl_pending'])
                    .limit(20)
                    .get(),
                db.collection('customDomains')
                    .where('sslStatus', 'in', ['pending', 'provisioning'])
                    .limit(20)
                    .get(),
            ]);

            // Deduplicate by domain name
            const domainMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
            byStatus.docs.forEach(doc => domainMap.set(doc.id, doc));
            bySslStatus.docs.forEach(doc => domainMap.set(doc.id, doc));
            const allDocs = Array.from(domainMap.values());

            if (allDocs.length === 0) {
                console.log('[ScheduledDNSCheck] No pending domains to check');
                return null;
            }

            console.log(`[ScheduledDNSCheck] Found ${allDocs.length} domains to check`);

            // Process each domain
            const results = await Promise.allSettled(
                allDocs.map(doc => checkAndUpdateDomain(doc.id, doc.data()))
            );

            // Log results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            console.log(`[ScheduledDNSCheck] Completed: ${successful} successful, ${failed} failed`);

        } catch (error) {
            console.error('[ScheduledDNSCheck] Error:', error);
        }

        return null;
    });

/**
 * Check and update a single domain's DNS status
 */
async function checkAndUpdateDomain(domain: string, data: any): Promise<void> {
    const { userId } = data;

    try {
        // Import DNS functions
        const dns = await import('dns');
        const { promisify } = await import('util');
        const resolve4 = promisify(dns.resolve4);

        // Simple A record check
        const EXPECTED_IPS = ['130.211.43.242'];
        
        let dnsVerified = false;
        try {
            const aRecords = await resolve4(domain);
            dnsVerified = aRecords.some(ip => EXPECTED_IPS.includes(ip));
        } catch (e) {
            // DNS lookup failed
            dnsVerified = false;
        }

        // ============================================
        // CHECK/CREATE SSL CERTIFICATE (Safety Net)
        // If cert is missing or pending, try to create/check it
        // ============================================
        let certState = data.gcpCertState || null;
        const sslStatus = data.sslStatus || 'pending';

        if (sslStatus === 'pending' || !data.gcpCertName) {
            // No cert exists — try to create one
            console.log(`[ScheduledDNSCheck] ${domain}: Missing SSL cert, attempting to create...`);
            try {
                const sslResult = await setupDomainSSL(domain);
                if (sslResult.success) {
                    console.log(`[ScheduledDNSCheck] ${domain}: SSL cert created (${sslResult.certName})`);
                    certState = sslResult.state;
                    await db.collection('customDomains').doc(domain).update({
                        sslStatus: 'provisioning',
                        gcpCertName: sslResult.certName,
                        gcpCertState: sslResult.state,
                        sslProvisionedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    if (userId) {
                        try {
                            await db.collection('users').doc(userId).collection('domains').doc(domain).update({
                                sslStatus: 'provisioning',
                                gcpCertName: sslResult.certName,
                                gcpCertState: sslResult.state,
                            });
                        } catch (e) { /* ignore */ }
                    }
                } else {
                    console.warn(`[ScheduledDNSCheck] ${domain}: SSL cert creation failed: ${sslResult.error}`);
                }
            } catch (sslErr: any) {
                console.warn(`[ScheduledDNSCheck] ${domain}: SSL error: ${sslErr.message}`);
            }
        } else if (sslStatus === 'provisioning' && data.gcpCertName) {
            // Cert exists but still provisioning — check if it's now ACTIVE
            try {
                const certStatus = await checkCertificateStatus(domain);
                if (certStatus.exists && certStatus.state === 'ACTIVE') {
                    console.log(`[ScheduledDNSCheck] ${domain}: SSL cert is now ACTIVE!`);
                    certState = 'ACTIVE';
                    const sslUpdate = {
                        sslStatus: 'active',
                        gcpCertState: 'ACTIVE',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    await db.collection('customDomains').doc(domain).update(sslUpdate);
                    if (userId) {
                        try {
                            await db.collection('users').doc(userId).collection('domains').doc(domain).update(sslUpdate);
                        } catch (e) { /* ignore */ }
                    }
                } else {
                    certState = certStatus.state;
                }
            } catch (e: any) {
                console.warn(`[ScheduledDNSCheck] ${domain}: Cert status check error: ${e.message}`);
            }
        }

        // ============================================
        // UPDATE DOMAIN STATUS
        // ============================================
        if (dnsVerified) {
            let newStatus = data.status;
            
            if (data.status === 'pending' || data.status === 'verifying') {
                newStatus = 'ssl_pending';
            } else if (data.status === 'ssl_pending' && certState === 'ACTIVE') {
                newStatus = 'active';
            } else if (data.status === 'ssl_pending') {
                // Keep ssl_pending, cert still provisioning
                newStatus = 'ssl_pending';
            }

            const updates: any = {
                dnsVerified: true,
                status: newStatus,
                sslStatus: certState === 'ACTIVE' ? 'active' : 'provisioning',
                lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // If both DNS and SSL are active, mark fully active
            if (newStatus === 'active' || (dnsVerified && certState === 'ACTIVE')) {
                updates.status = 'active';
                updates.sslStatus = 'active';
            }

            await db.collection('customDomains').doc(domain).update(updates);
            
            if (userId) {
                try {
                    await db.collection('users').doc(userId).collection('domains').doc(domain).update(updates);
                } catch (e) { /* ignore */ }
            }

            console.log(`[ScheduledDNSCheck] ${domain}: DNS verified, status -> ${updates.status}, ssl -> ${updates.sslStatus}`);
        } else {
            // Update verification attempt count
            await db.collection('customDomains').doc(domain).update({
                verificationAttempts: admin.firestore.FieldValue.increment(1),
                lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

    } catch (error) {
        console.error(`[ScheduledDNSCheck] Error checking ${domain}:`, error);
        throw error;
    }
}











