/**
 * Resend Webhook Handler
 * 
 * Receives email delivery events from Resend and updates campaign stats in Firestore.
 * Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 * 
 * Setup: Configure in https://resend.com/webhooks  
 * URL: https://us-central1-quimeraai.cloudfunctions.net/resendWebhook
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

interface ResendWebhookPayload {
    type: string;
    created_at: string;
    data: {
        email_id: string;
        from: string;
        to: string[];
        subject: string;
        created_at: string;
        // Open-specific
        // Click-specific
        click?: {
            link: string;
            timestamp: string;
        };
        // Bounce-specific
        bounce?: {
            message: string;
            type?: string; // 'hard' | 'soft'
        };
        // Complaint-specific
        complaint?: {
            type: string;
        };
        tags?: { name: string; value: string }[];
    };
}

type ResendEventType =
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.opened'
    | 'email.clicked'
    | 'email.bounced'
    | 'email.complained';

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export const resendWebhook = functions.https.onRequest(async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const payload = req.body as ResendWebhookPayload;
        const eventType = payload.type as ResendEventType;
        const eventData = payload.data;

        if (!eventType || !eventData) {
            console.warn('[ResendWebhook] Invalid payload:', JSON.stringify(req.body).slice(0, 200));
            res.status(400).send('Invalid payload');
            return;
        }

        console.log(`[ResendWebhook] Received: ${eventType} for ${eventData.email_id}`);

        // Extract campaign and project info from tags
        const tags = eventData.tags || [];
        const campaignId = tags.find(t => t.name === 'campaign')?.value;
        const projectId = tags.find(t => t.name === 'project')?.value;
        const recipientEmail = eventData.to?.[0];

        if (!campaignId || !recipientEmail) {
            // Not a campaign email — could be transactional, skip
            console.log('[ResendWebhook] Non-campaign email, skipping');
            res.status(200).send('OK - skipped');
            return;
        }

        // Process the event
        switch (eventType) {
            case 'email.delivered':
                await handleDelivered(eventData.email_id, campaignId, projectId, recipientEmail, payload.created_at);
                break;

            case 'email.opened':
                await handleOpened(eventData.email_id, campaignId, projectId, recipientEmail, payload.created_at);
                break;

            case 'email.clicked':
                await handleClicked(
                    eventData.email_id,
                    campaignId,
                    projectId,
                    recipientEmail,
                    eventData.click?.link || '',
                    payload.created_at
                );
                break;

            case 'email.bounced':
                await handleBounced(
                    eventData.email_id,
                    campaignId,
                    projectId,
                    recipientEmail,
                    eventData.bounce?.type || 'unknown',
                    eventData.bounce?.message || '',
                    payload.created_at
                );
                break;

            case 'email.complained':
                await handleComplained(eventData.email_id, campaignId, projectId, recipientEmail, payload.created_at);
                break;

            default:
                console.log(`[ResendWebhook] Unhandled event type: ${eventType}`);
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[ResendWebhook] Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Find the email log document by providerMessageId across all possible paths
 */
async function findEmailLog(emailId: string, campaignId: string, projectId?: string): Promise<{
    ref: admin.firestore.DocumentReference;
    userId: string;
    projectId: string;
} | null> {
    // Try admin campaigns first
    const adminLogsQuery = await db.collectionGroup('emailLogs')
        .where('providerMessageId', '==', emailId)
        .limit(1)
        .get();

    if (!adminLogsQuery.empty) {
        const doc = adminLogsQuery.docs[0];
        // Extract userId and projectId from path: users/{userId}/projects/{projectId}/emailLogs/{logId}
        const pathParts = doc.ref.path.split('/');
        return {
            ref: doc.ref,
            userId: pathParts[1] || '',
            projectId: pathParts[3] || projectId || '',
        };
    }

    // Check admin-level logs
    const adminLevelQuery = await db.collection('adminEmailLogs')
        .where('providerMessageId', '==', emailId)
        .limit(1)
        .get();

    if (!adminLevelQuery.empty) {
        return {
            ref: adminLevelQuery.docs[0].ref,
            userId: 'admin',
            projectId: 'admin',
        };
    }

    return null;
}

/**
 * Find the campaign document reference
 */
async function findCampaignRef(campaignId: string, projectId?: string): Promise<admin.firestore.DocumentReference | null> {
    // Try admin campaigns first
    const adminDoc = await db.doc(`adminEmailCampaigns/${campaignId}`).get();
    if (adminDoc.exists) return adminDoc.ref;

    // Try to find via collection group
    if (projectId) {
        const query = await db.collectionGroup('emailCampaigns')
            .where(admin.firestore.FieldPath.documentId(), '==', campaignId)
            .limit(1)
            .get();

        if (!query.empty) return query.docs[0].ref;
    }

    return null;
}

/**
 * Handle email.delivered event
 */
async function handleDelivered(
    emailId: string,
    campaignId: string,
    projectId: string | undefined,
    recipientEmail: string,
    timestamp: string
) {
    // Update the email log
    const logResult = await findEmailLog(emailId, campaignId, projectId);
    if (logResult) {
        await logResult.ref.update({
            status: 'delivered',
            deliveredAt: new Date(timestamp),
        });
    }

    // Update campaign stats
    const campaignRef = await findCampaignRef(campaignId, projectId);
    if (campaignRef) {
        await campaignRef.update({
            'stats.delivered': admin.firestore.FieldValue.increment(1),
        });
    }

    // Log the event
    await logTrackingEvent(campaignId, 'delivered', recipientEmail, timestamp);
}

/**
 * Handle email.opened event
 */
async function handleOpened(
    emailId: string,
    campaignId: string,
    projectId: string | undefined,
    recipientEmail: string,
    timestamp: string
) {
    const logResult = await findEmailLog(emailId, campaignId, projectId);
    if (logResult) {
        await logResult.ref.update({
            status: 'opened',
            openedAt: admin.firestore.FieldValue.arrayUnion(new Date(timestamp)),
            openCount: admin.firestore.FieldValue.increment(1),
        });
    }

    // Update campaign stats (unique opens tracked via set)
    const campaignRef = await findCampaignRef(campaignId, projectId);
    if (campaignRef) {
        await campaignRef.update({
            'stats.totalOpens': admin.firestore.FieldValue.increment(1),
        });

        // Track unique opens
        const trackingRef = db.doc(`emailTracking/${campaignId}/opens/${emailId}`);
        const trackingDoc = await trackingRef.get();
        if (!trackingDoc.exists) {
            await trackingRef.set({
                email: recipientEmail,
                firstOpenAt: new Date(timestamp),
                providerMessageId: emailId,
            });
            await campaignRef.update({
                'stats.uniqueOpens': admin.firestore.FieldValue.increment(1),
            });
        }
    }

    await logTrackingEvent(campaignId, 'opened', recipientEmail, timestamp);
}

/**
 * Handle email.clicked event
 */
async function handleClicked(
    emailId: string,
    campaignId: string,
    projectId: string | undefined,
    recipientEmail: string,
    link: string,
    timestamp: string
) {
    const logResult = await findEmailLog(emailId, campaignId, projectId);
    if (logResult) {
        await logResult.ref.update({
            status: 'clicked',
            clickedLinks: admin.firestore.FieldValue.arrayUnion({
                url: link,
                at: new Date(timestamp),
            }),
            clickCount: admin.firestore.FieldValue.increment(1),
        });
    }

    const campaignRef = await findCampaignRef(campaignId, projectId);
    if (campaignRef) {
        await campaignRef.update({
            'stats.totalClicks': admin.firestore.FieldValue.increment(1),
        });

        // Track unique clicks
        const trackingRef = db.doc(`emailTracking/${campaignId}/clicks/${emailId}`);
        const trackingDoc = await trackingRef.get();
        if (!trackingDoc.exists) {
            await trackingRef.set({
                email: recipientEmail,
                firstClickAt: new Date(timestamp),
                link,
                providerMessageId: emailId,
            });
            await campaignRef.update({
                'stats.uniqueClicks': admin.firestore.FieldValue.increment(1),
            });
        }

        // Track link-level clicks
        const linkHash = Buffer.from(link).toString('base64').slice(0, 20);
        const linkRef = db.doc(`emailTracking/${campaignId}/linkClicks/${linkHash}`);
        await linkRef.set({
            url: link,
            totalClicks: admin.firestore.FieldValue.increment(1),
            lastClickAt: new Date(timestamp),
        }, { merge: true });
    }

    await logTrackingEvent(campaignId, 'clicked', recipientEmail, timestamp, { link });
}

/**
 * Handle email.bounced event
 */
async function handleBounced(
    emailId: string,
    campaignId: string,
    projectId: string | undefined,
    recipientEmail: string,
    bounceType: string,
    bounceMessage: string,
    timestamp: string
) {
    const logResult = await findEmailLog(emailId, campaignId, projectId);
    if (logResult) {
        await logResult.ref.update({
            status: 'bounced',
            bouncedAt: new Date(timestamp),
            bounceType,
            bounceMessage,
        });
    }

    const campaignRef = await findCampaignRef(campaignId, projectId);
    if (campaignRef) {
        await campaignRef.update({
            'stats.bounced': admin.firestore.FieldValue.increment(1),
            [`stats.bounceDetails.${bounceType === 'hard' ? 'hard' : 'soft'}`]:
                admin.firestore.FieldValue.increment(1),
        });
    }

    // Store bounced email for future suppression
    await db.collection('emailSuppressionList').doc(recipientEmail.toLowerCase()).set({
        email: recipientEmail.toLowerCase(),
        reason: 'bounced',
        bounceType,
        bounceMessage,
        campaignId,
        suppressedAt: new Date(timestamp),
    }, { merge: true });

    await logTrackingEvent(campaignId, 'bounced', recipientEmail, timestamp, { bounceType, bounceMessage });
}

/**
 * Handle email.complained (spam) event
 */
async function handleComplained(
    emailId: string,
    campaignId: string,
    projectId: string | undefined,
    recipientEmail: string,
    timestamp: string
) {
    const logResult = await findEmailLog(emailId, campaignId, projectId);
    if (logResult) {
        await logResult.ref.update({
            status: 'complained',
            complainedAt: new Date(timestamp),
        });
    }

    const campaignRef = await findCampaignRef(campaignId, projectId);
    if (campaignRef) {
        await campaignRef.update({
            'stats.complaints': admin.firestore.FieldValue.increment(1),
        });
    }

    // Add to suppression list (spam complaints are serious)
    await db.collection('emailSuppressionList').doc(recipientEmail.toLowerCase()).set({
        email: recipientEmail.toLowerCase(),
        reason: 'complained',
        campaignId,
        suppressedAt: new Date(timestamp),
    }, { merge: true });

    await logTrackingEvent(campaignId, 'complained', recipientEmail, timestamp);
}

// =============================================================================
// TRACKING EVENT LOG
// =============================================================================

/**
 * Log a tracking event for analytics
 */
async function logTrackingEvent(
    campaignId: string,
    eventType: string,
    email: string,
    timestamp: string,
    extra?: Record<string, any>
) {
    await db.collection(`emailTracking/${campaignId}/events`).add({
        type: eventType,
        email,
        timestamp: new Date(timestamp),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...extra,
    });
}
