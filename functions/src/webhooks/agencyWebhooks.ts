/**
 * Agency Webhooks
 * Fire webhooks for agency events to external systems
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import { isPlatformAdmin } from '../utils/platformAdmin';

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

export type WebhookEventType =
    | 'client.created'
    | 'client.updated'
    | 'client.deleted'
    | 'project.published'
    | 'project.unpublished'
    | 'lead.captured'
    | 'payment.received'
    | 'subscription.changed'
    | 'ai_credits.low'
    | 'invoice.created';

interface WebhookConfig {
    id: string;
    tenantId: string;
    url: string;
    secret: string;
    events: WebhookEventType[];
    enabled: boolean;
    retryCount: number;
    lastTriggeredAt?: admin.firestore.Timestamp;
    lastStatus?: 'success' | 'failed';
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

interface WebhookPayload {
    event: WebhookEventType;
    timestamp: string;
    tenantId: string;
    data: Record<string, any>;
}

interface WebhookDeliveryLog {
    webhookId: string;
    tenantId: string;
    event: WebhookEventType;
    url: string;
    status: 'success' | 'failed' | 'pending';
    statusCode?: number;
    responseBody?: string;
    error?: string;
    duration?: number;
    attemptNumber: number;
    createdAt: admin.firestore.Timestamp;
}

// =============================================================================
// WEBHOOK DELIVERY
// =============================================================================

/**
 * Send webhook to configured endpoint
 */
async function deliverWebhook(
    config: WebhookConfig,
    event: WebhookEventType,
    data: Record<string, any>,
    attemptNumber: number = 1
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        tenantId: config.tenantId,
        data,
    };

    const payloadString = JSON.stringify(payload);
    
    // Generate signature
    const signature = crypto
        .createHmac('sha256', config.secret)
        .update(payloadString)
        .digest('hex');

    const startTime = Date.now();

    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': event,
                'X-Webhook-Timestamp': payload.timestamp,
            },
            body: payloadString,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        const responseBody = await response.text();

        // Log delivery
        await logWebhookDelivery({
            webhookId: config.id,
            tenantId: config.tenantId,
            event,
            url: config.url,
            status: response.ok ? 'success' : 'failed',
            statusCode: response.status,
            responseBody: responseBody.slice(0, 1000),
            duration,
            attemptNumber,
            createdAt: admin.firestore.Timestamp.now(),
        });

        // Update webhook config
        await db.collection('webhookConfigs').doc(config.id).update({
            lastTriggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            lastStatus: response.ok ? 'success' : 'failed',
        });

        return {
            success: response.ok,
            statusCode: response.status,
        };

    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log failed delivery
        await logWebhookDelivery({
            webhookId: config.id,
            tenantId: config.tenantId,
            event,
            url: config.url,
            status: 'failed',
            error: errorMessage,
            duration,
            attemptNumber,
            createdAt: admin.firestore.Timestamp.now(),
        });

        // Update webhook config
        await db.collection('webhookConfigs').doc(config.id).update({
            lastTriggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            lastStatus: 'failed',
        });

        return {
            success: false,
            error: errorMessage,
        };
    }
}

async function logWebhookDelivery(log: WebhookDeliveryLog): Promise<void> {
    await db.collection('webhookDeliveryLogs').add(log);
}

// =============================================================================
// EVENT DISPATCHER
// =============================================================================

/**
 * Dispatch event to all configured webhooks for a tenant
 */
export async function dispatchWebhookEvent(
    tenantId: string,
    event: WebhookEventType,
    data: Record<string, any>
): Promise<void> {
    // Get tenant's webhook configs
    const configsQuery = await db.collection('webhookConfigs')
        .where('tenantId', '==', tenantId)
        .where('enabled', '==', true)
        .get();

    if (configsQuery.empty) {
        return;
    }

    // Filter configs that subscribe to this event
    const relevantConfigs = configsQuery.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as WebhookConfig))
        .filter((config) => config.events.includes(event));

    // Deliver to each webhook
    await Promise.allSettled(
        relevantConfigs.map((config) => deliverWebhook(config, event, data))
    );
}

// =============================================================================
// FIRESTORE TRIGGERS
// =============================================================================

/**
 * Trigger webhook when client tenant is created
 */
export const onClientCreated = functions.firestore
    .document('tenants/{tenantId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        
        // Only trigger for sub-clients
        if (!data.ownerTenantId) return;

        await dispatchWebhookEvent(data.ownerTenantId, 'client.created', {
            clientId: snapshot.id,
            clientName: data.name,
            clientEmail: data.ownerEmail,
            plan: data.subscriptionPlan,
        });
    });

/**
 * Trigger webhook when project is published
 */
export const onProjectPublished = functions.firestore
    .document('tenants/{tenantId}/projects/{projectId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if project was just published
        if (before.status !== 'published' && after.status === 'published') {
            const tenantDoc = await db.collection('tenants').doc(context.params.tenantId).get();
            const agencyTenantId = tenantDoc.data()?.ownerTenantId || context.params.tenantId;

            await dispatchWebhookEvent(agencyTenantId, 'project.published', {
                projectId: context.params.projectId,
                projectName: after.name,
                clientTenantId: context.params.tenantId,
                publishedAt: new Date().toISOString(),
            });
        }
    });

/**
 * Trigger webhook when lead is captured
 */
export const onLeadCaptured = functions.firestore
    .document('tenants/{tenantId}/leads/{leadId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        
        const tenantDoc = await db.collection('tenants').doc(context.params.tenantId).get();
        const agencyTenantId = tenantDoc.data()?.ownerTenantId || context.params.tenantId;

        await dispatchWebhookEvent(agencyTenantId, 'lead.captured', {
            leadId: snapshot.id,
            email: data.email,
            name: data.name,
            source: data.source,
            clientTenantId: context.params.tenantId,
            capturedAt: new Date().toISOString(),
        });
    });

// =============================================================================
// WEBHOOK MANAGEMENT API
// =============================================================================

/**
 * Create webhook configuration
 */
export const createWebhook = functions.https.onCall(
    async (data: { url: string; events: WebhookEventType[]; tenantId?: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
        }

        // Check if user is platform Owner/SuperAdmin (full access)
        const isAdmin = await isPlatformAdmin(context.auth.uid);
        
        let tenantId: string;
        
        if (isAdmin && data.tenantId) {
            // Platform admins can specify any tenant
            tenantId = data.tenantId;
        } else {
            // Regular users must be agency owners/admins
            const memberQuery = await db.collection('tenantMembers')
                .where('userId', '==', context.auth.uid)
                .where('role', 'in', ['agency_owner', 'agency_admin', 'owner'])
                .limit(1)
                .get();

            if (memberQuery.empty) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos');
            }

            tenantId = memberQuery.docs[0].data().tenantId;
        }

        // Validate URL
        try {
            new URL(data.url);
        } catch {
            throw new functions.https.HttpsError('invalid-argument', 'URL inválida');
        }

        // Generate secret
        const secret = crypto.randomBytes(32).toString('hex');

        const webhookConfig = {
            tenantId,
            url: data.url,
            secret,
            events: data.events,
            enabled: true,
            retryCount: 3,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('webhookConfigs').add(webhookConfig);

        return {
            success: true,
            webhookId: docRef.id,
            secret, // Return secret only on creation
        };
    }
);

/**
 * Update webhook configuration
 */
export const updateWebhook = functions.https.onCall(
    async (data: { webhookId: string; url?: string; events?: WebhookEventType[]; enabled?: boolean }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
        }

        const webhookDoc = await db.collection('webhookConfigs').doc(data.webhookId).get();
        if (!webhookDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Webhook no encontrado');
        }

        // Check if user is platform Owner/SuperAdmin (full access)
        const isAdmin = await isPlatformAdmin(context.auth.uid);

        if (!isAdmin) {
            // Regular users must verify tenant ownership
            const memberQuery = await db.collection('tenantMembers')
                .where('userId', '==', context.auth.uid)
                .where('tenantId', '==', webhookDoc.data()?.tenantId)
                .limit(1)
                .get();

            if (memberQuery.empty) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos');
            }
        }

        const updates: Record<string, any> = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (data.url !== undefined) updates.url = data.url;
        if (data.events !== undefined) updates.events = data.events;
        if (data.enabled !== undefined) updates.enabled = data.enabled;

        await db.collection('webhookConfigs').doc(data.webhookId).update(updates);

        return { success: true };
    }
);

/**
 * Delete webhook
 */
export const deleteWebhook = functions.https.onCall(
    async (data: { webhookId: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
        }

        const webhookDoc = await db.collection('webhookConfigs').doc(data.webhookId).get();
        if (!webhookDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Webhook no encontrado');
        }

        // Check if user is platform Owner/SuperAdmin (full access)
        const isAdmin = await isPlatformAdmin(context.auth.uid);

        if (!isAdmin) {
            // Regular users must verify tenant ownership
            const memberQuery = await db.collection('tenantMembers')
                .where('userId', '==', context.auth.uid)
                .where('tenantId', '==', webhookDoc.data()?.tenantId)
                .limit(1)
                .get();

            if (memberQuery.empty) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos');
            }
        }

        await db.collection('webhookConfigs').doc(data.webhookId).delete();

        return { success: true };
    }
);

/**
 * Test webhook
 */
export const testWebhook = functions.https.onCall(
    async (data: { webhookId: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Autenticación requerida');
        }

        const webhookDoc = await db.collection('webhookConfigs').doc(data.webhookId).get();
        if (!webhookDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Webhook no encontrado');
        }

        // Check if user is platform Owner/SuperAdmin (full access)
        const isAdmin = await isPlatformAdmin(context.auth.uid);

        if (!isAdmin) {
            // Regular users must verify tenant ownership
            const memberQuery = await db.collection('tenantMembers')
                .where('userId', '==', context.auth.uid)
                .where('tenantId', '==', webhookDoc.data()?.tenantId)
                .limit(1)
                .get();

            if (memberQuery.empty) {
                throw new functions.https.HttpsError('permission-denied', 'No tienes permisos');
            }
        }

        const config = { id: webhookDoc.id, ...webhookDoc.data() } as WebhookConfig;

        const result = await deliverWebhook(
            config,
            'client.created',
            {
                test: true,
                message: 'Este es un evento de prueba',
                timestamp: new Date().toISOString(),
            }
        );

        return result;
    }
);
