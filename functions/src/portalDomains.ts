/**
 * Portal Domains Cloud Functions
 * Handles portal domain management for white-label tenants
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as dns from 'dns';
import { promisify } from 'util';

const db = admin.firestore();
const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

// =============================================================================
// TYPES
// =============================================================================

interface AddPortalDomainData {
    tenantId: string;
    domain: string;
}

interface VerifyPortalDomainData {
    tenantId: string;
    domain: string;
}

interface RemovePortalDomainData {
    tenantId: string;
}

interface PortalDomainRecord {
    tenantId: string;
    domain: string;
    status: 'pending' | 'verifying' | 'active' | 'error';
    sslStatus: 'pending' | 'active' | 'error';
    verificationToken: string;
    dnsRecords: {
        cname: { expected: string; verified: boolean };
        txt: { expected: string; verified: boolean };
    };
    lastVerifiedAt?: FirebaseFirestore.Timestamp;
    createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
    updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateVerificationToken(): string {
    return `quimera-verify-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

function normalizeDomain(domain: string): string {
    return domain
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.$/, '')
        .trim();
}

async function hasTenantPermission(tenantId: string, userId: string, permission: string): Promise<boolean> {
    const membershipId = `${tenantId}_${userId}`;
    const membershipDoc = await db.collection('tenantMembers').doc(membershipId).get();
    
    if (!membershipDoc.exists) return false;
    
    const permissions = membershipDoc.data()?.permissions || {};
    return permissions[permission] === true;
}

// Expected CNAME target for portal domains
const PORTAL_CNAME_TARGET = 'portal.quimera.ai'; // Update with actual production domain

// =============================================================================
// ADD PORTAL DOMAIN
// =============================================================================

export const addPortalDomain = functions.https.onCall(
    async (data: AddPortalDomainData, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }

        const { tenantId, domain } = data;
        const userId = context.auth.uid;

        if (!tenantId || !domain) {
            throw new functions.https.HttpsError('invalid-argument', 'tenantId y domain son requeridos');
        }

        // Check permission
        const hasPermission = await hasTenantPermission(tenantId, userId, 'canManageSettings');
        if (!hasPermission) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para gestionar dominios');
        }

        // Get tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant no encontrado');
        }

        const tenantData = tenantDoc.data()!;

        // Check tenant plan allows custom domains
        const allowedPlans = ['agency', 'agency_plus', 'enterprise'];
        if (!allowedPlans.includes(tenantData.subscriptionPlan)) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Tu plan no incluye dominios personalizados para portal'
            );
        }

        const normalizedDomain = normalizeDomain(domain);

        // Validate domain format
        const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
        if (!domainRegex.test(normalizedDomain)) {
            throw new functions.https.HttpsError('invalid-argument', 'Formato de dominio inválido');
        }

        // Check if domain is already in use
        const existingDomain = await db.collection('portalDomains').doc(normalizedDomain).get();
        if (existingDomain.exists) {
            const existingData = existingDomain.data()!;
            if (existingData.tenantId !== tenantId) {
                throw new functions.https.HttpsError('already-exists', 'Este dominio ya está en uso');
            }
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();

        // Create or update portal domain record
        const domainRecord: PortalDomainRecord = {
            tenantId,
            domain: normalizedDomain,
            status: 'pending',
            sslStatus: 'pending',
            verificationToken,
            dnsRecords: {
                cname: {
                    expected: PORTAL_CNAME_TARGET,
                    verified: false,
                },
                txt: {
                    expected: verificationToken,
                    verified: false,
                },
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('portalDomains').doc(normalizedDomain).set(domainRecord);

        // Update tenant branding
        await db.collection('tenants').doc(tenantId).update({
            'branding.customDomain': normalizedDomain,
            'branding.customDomainVerified': false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Portal domain added', {
            tenantId,
            domain: normalizedDomain,
            userId,
        });

        return {
            success: true,
            domain: normalizedDomain,
            verificationToken,
            dnsRecords: {
                cname: {
                    type: 'CNAME',
                    name: normalizedDomain,
                    value: PORTAL_CNAME_TARGET,
                    ttl: 3600,
                },
                txt: {
                    type: 'TXT',
                    name: `_quimera-verify.${normalizedDomain}`,
                    value: verificationToken,
                    ttl: 3600,
                },
            },
        };
    }
);

// =============================================================================
// VERIFY PORTAL DOMAIN
// =============================================================================

export const verifyPortalDomain = functions.https.onCall(
    async (data: VerifyPortalDomainData, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }

        const { tenantId, domain } = data;
        const userId = context.auth.uid;

        if (!tenantId || !domain) {
            throw new functions.https.HttpsError('invalid-argument', 'tenantId y domain son requeridos');
        }

        // Check permission
        const hasPermission = await hasTenantPermission(tenantId, userId, 'canManageSettings');
        if (!hasPermission) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para verificar dominios');
        }

        const normalizedDomain = normalizeDomain(domain);

        // Get domain record
        const domainDoc = await db.collection('portalDomains').doc(normalizedDomain).get();
        if (!domainDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Dominio no encontrado');
        }

        const domainData = domainDoc.data() as PortalDomainRecord;

        if (domainData.tenantId !== tenantId) {
            throw new functions.https.HttpsError('permission-denied', 'Este dominio pertenece a otro tenant');
        }

        let cnameVerified = false;
        let txtVerified = false;
        const errors: string[] = [];

        // Verify CNAME record
        try {
            const cnameRecords = await resolveCname(normalizedDomain);
            cnameVerified = cnameRecords.some(
                record => record.toLowerCase() === PORTAL_CNAME_TARGET.toLowerCase()
            );
            if (!cnameVerified) {
                errors.push(`CNAME no apunta a ${PORTAL_CNAME_TARGET}`);
            }
        } catch (err: any) {
            if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
                errors.push('Registro CNAME no encontrado');
            } else {
                functions.logger.warn('DNS CNAME lookup error', { domain: normalizedDomain, error: err.message });
                errors.push('Error verificando CNAME');
            }
        }

        // Verify TXT record
        try {
            const txtRecords = await resolveTxt(`_quimera-verify.${normalizedDomain}`);
            txtVerified = txtRecords.flat().some(
                record => record === domainData.verificationToken
            );
            if (!txtVerified) {
                errors.push('Token de verificación TXT no encontrado');
            }
        } catch (err: any) {
            if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
                errors.push('Registro TXT no encontrado');
            } else {
                functions.logger.warn('DNS TXT lookup error', { domain: normalizedDomain, error: err.message });
                errors.push('Error verificando TXT');
            }
        }

        // Update domain record
        const newStatus = cnameVerified && txtVerified ? 'active' : 'verifying';
        
        await db.collection('portalDomains').doc(normalizedDomain).update({
            status: newStatus,
            'dnsRecords.cname.verified': cnameVerified,
            'dnsRecords.txt.verified': txtVerified,
            lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // If verified, update tenant
        if (cnameVerified && txtVerified) {
            await db.collection('tenants').doc(tenantId).update({
                'branding.customDomainVerified': true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        functions.logger.info('Portal domain verification', {
            tenantId,
            domain: normalizedDomain,
            cnameVerified,
            txtVerified,
        });

        return {
            success: true,
            verified: cnameVerified && txtVerified,
            cnameVerified,
            txtVerified,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
);

// =============================================================================
// REMOVE PORTAL DOMAIN
// =============================================================================

export const removePortalDomain = functions.https.onCall(
    async (data: RemovePortalDomainData, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }

        const { tenantId } = data;
        const userId = context.auth.uid;

        if (!tenantId) {
            throw new functions.https.HttpsError('invalid-argument', 'tenantId es requerido');
        }

        // Check permission
        const hasPermission = await hasTenantPermission(tenantId, userId, 'canManageSettings');
        if (!hasPermission) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para eliminar dominios');
        }

        // Get tenant
        const tenantDoc = await db.collection('tenants').doc(tenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Tenant no encontrado');
        }

        const tenantData = tenantDoc.data()!;
        const customDomain = tenantData.branding?.customDomain;

        if (!customDomain) {
            throw new functions.https.HttpsError('not-found', 'No hay dominio personalizado configurado');
        }

        // Delete domain record
        await db.collection('portalDomains').doc(customDomain).delete();

        // Update tenant
        await db.collection('tenants').doc(tenantId).update({
            'branding.customDomain': admin.firestore.FieldValue.delete(),
            'branding.customDomainVerified': admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('Portal domain removed', {
            tenantId,
            domain: customDomain,
            userId,
        });

        return { success: true };
    }
);

// =============================================================================
// SCHEDULED DNS CHECK
// =============================================================================

export const scheduledPortalDNSCheck = functions.pubsub
    .schedule('every 6 hours')
    .onRun(async () => {
        // Get all domains that need verification
        const pendingDomains = await db.collection('portalDomains')
            .where('status', 'in', ['pending', 'verifying'])
            .get();

        let verified = 0;
        let failed = 0;

        for (const doc of pendingDomains.docs) {
            const domainData = doc.data() as PortalDomainRecord;
            
            try {
                let cnameVerified = false;
                let txtVerified = false;

                // Check CNAME
                try {
                    const cnameRecords = await resolveCname(domainData.domain);
                    cnameVerified = cnameRecords.some(
                        record => record.toLowerCase() === PORTAL_CNAME_TARGET.toLowerCase()
                    );
                } catch (e) {
                    // CNAME not found
                }

                // Check TXT
                try {
                    const txtRecords = await resolveTxt(`_quimera-verify.${domainData.domain}`);
                    txtVerified = txtRecords.flat().some(
                        record => record === domainData.verificationToken
                    );
                } catch (e) {
                    // TXT not found
                }

                const isVerified = cnameVerified && txtVerified;
                const newStatus = isVerified ? 'active' : domainData.status;

                await doc.ref.update({
                    status: newStatus,
                    'dnsRecords.cname.verified': cnameVerified,
                    'dnsRecords.txt.verified': txtVerified,
                    lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                if (isVerified) {
                    // Update tenant
                    await db.collection('tenants').doc(domainData.tenantId).update({
                        'branding.customDomainVerified': true,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    verified++;
                }
            } catch (err: any) {
                functions.logger.warn('Error checking portal domain', {
                    domain: domainData.domain,
                    error: err.message,
                });
                failed++;
            }
        }

        functions.logger.info('Scheduled portal DNS check completed', {
            total: pendingDomains.size,
            verified,
            failed,
        });

        return null;
    });






