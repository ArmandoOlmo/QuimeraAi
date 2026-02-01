/**
 * Domain Triggers
 * 
 * Firestore triggers and scheduled functions for domain management.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Trigger when a new domain is created
 * Sets up initial state and schedules verification
 */
export const onDomainCreate = functions.firestore
    .document('customDomains/{domain}')
    .onCreate(async (_snap, context) => {
        const domain = context.params.domain;

        console.log(`[DomainTrigger] New domain created: ${domain}`);

        // Could trigger additional setup here:
        // - Send notification to user
        // - Add to Cloud Run domain mapping queue
        // - Schedule initial DNS check

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
            // Find domains that are pending verification
            const pendingDomains = await db.collection('customDomains')
                .where('status', 'in', ['pending', 'verifying', 'ssl_pending'])
                .limit(10) // Process in batches
                .get();

            if (pendingDomains.empty) {
                console.log('[ScheduledDNSCheck] No pending domains to check');
                return null;
            }

            console.log(`[ScheduledDNSCheck] Found ${pendingDomains.size} domains to check`);

            // Process each domain
            const results = await Promise.allSettled(
                pendingDomains.docs.map(doc => checkAndUpdateDomain(doc.id, doc.data()))
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
        const EXPECTED_IPS = ['216.239.32.21', '216.239.34.21', '216.239.36.21', '216.239.38.21'];
        
        let verified = false;
        try {
            const aRecords = await resolve4(domain);
            verified = aRecords.some(ip => EXPECTED_IPS.includes(ip));
        } catch (e) {
            // DNS lookup failed
            verified = false;
        }

        if (verified) {
            // Update status based on current state
            let newStatus = data.status;
            
            if (data.status === 'pending' || data.status === 'verifying') {
                newStatus = 'ssl_pending';
            } else if (data.status === 'ssl_pending') {
                // Check if enough time has passed for SSL provisioning
                newStatus = 'active';
            }

            const updates = {
                dnsVerified: true,
                status: newStatus,
                sslStatus: newStatus === 'active' ? 'active' : 'provisioning',
                lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('customDomains').doc(domain).update(updates);
            
            if (userId) {
                await db.collection('users').doc(userId).collection('domains').doc(domain).update(updates);
            }

            console.log(`[ScheduledDNSCheck] ${domain}: DNS verified, status -> ${newStatus}`);
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











