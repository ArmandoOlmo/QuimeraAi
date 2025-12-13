/**
 * Campaign Service
 * Servicio para envío de campañas de email marketing
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail, renderTemplate, isValidEmail } from '../emailService';

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

interface CampaignData {
    id: string;
    name: string;
    subject: string;
    previewText?: string;
    htmlContent: string;
    audienceType: 'all' | 'segment' | 'custom';
    audienceSegmentId?: string;
    customRecipientEmails?: string[];
    excludeEmails?: string[];
    status: string;
}

interface RecipientData {
    email: string;
    firstName?: string;
    lastName?: string;
    customerId?: string;
}

interface SendCampaignResult {
    success: boolean;
    totalRecipients: number;
    sent: number;
    failed: number;
    errors?: string[];
}

// =============================================================================
// CAMPAIGN SENDING
// =============================================================================

/**
 * Send a campaign to all recipients
 * Callable function from the frontend
 */
export const sendCampaign = functions.https.onCall(async (data: {
    userId: string;
    storeId: string;  // Note: This is actually projectId from frontend
    campaignId: string;
}, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, storeId: projectId, campaignId } = data;

    // Verify user owns this project
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'User does not have access to this project');
    }

    try {
        // Get campaign data (using projects path)
        const campaignDoc = await db.doc(`users/${userId}/projects/${projectId}/emailCampaigns/${campaignId}`).get();
        
        if (!campaignDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Campaign not found');
        }

        const campaign = campaignDoc.data() as CampaignData;

        // Verify campaign is in sendable state
        if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
            throw new functions.https.HttpsError('failed-precondition', 'Campaign is not in a sendable state');
        }

        // Update status to sending
        await campaignDoc.ref.update({
            status: 'sending',
            sendingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Get recipients based on audience type
        const recipients = await getRecipients(userId, projectId, campaign);

        if (recipients.length === 0) {
            await campaignDoc.ref.update({
                status: 'sent',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                'stats.totalRecipients': 0,
                'stats.sent': 0,
            });
            return { success: true, totalRecipients: 0, sent: 0, failed: 0 };
        }

        // Get email settings
        const emailSettingsDoc = await db.doc(`users/${userId}/projects/${projectId}/settings/email`).get();
        const emailSettings = emailSettingsDoc.data() || {};

        const projectDoc = await db.doc(`users/${userId}/projects/${projectId}`).get();
        const projectSettings = projectDoc.data() || {};

        // Prepare email parameters
        const fromEmail = emailSettings.fromEmail || 'noreply@quimera.ai';
        const fromName = emailSettings.fromName || projectSettings.name || 'Quimera';

        // Send emails in batches
        const result = await sendCampaignEmails({
            campaign,
            recipients,
            fromEmail,
            fromName,
            userId,
            projectId,
        });

        // Update campaign with results
        await campaignDoc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            'stats.totalRecipients': recipients.length,
            'stats.sent': result.sent,
            'stats.delivered': result.sent, // Initially same as sent
            'stats.bounced': result.failed,
        });

        return result;

    } catch (error: any) {
        console.error('Error sending campaign:', error);
        
        // Update status to indicate failure
        await db.doc(`users/${userId}/projects/${projectId}/emailCampaigns/${campaignId}`).update({
            status: 'draft', // Revert to draft so it can be retried
            lastError: error.message,
        });

        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Send campaign to a specific segment
 */
export const sendCampaignToSegment = functions.https.onCall(async (data: {
    userId: string;
    storeId: string;
    campaignId: string;
    segmentId: string;
}, context) => {
    if (!context.auth || context.auth.uid !== data.userId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // This would be similar to sendCampaign but with segment-specific logic
    // For now, delegate to the main sendCampaign function
    return sendCampaign.run(data, context);
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get recipients based on campaign audience settings
 */
async function getRecipients(
    userId: string,
    projectId: string,
    campaign: CampaignData
): Promise<RecipientData[]> {
    const recipients: RecipientData[] = [];
    const excludeSet = new Set(campaign.excludeEmails?.map(e => e.toLowerCase()) || []);

    if (campaign.audienceType === 'custom' && campaign.customRecipientEmails) {
        // Custom list of emails
        for (const email of campaign.customRecipientEmails) {
            if (isValidEmail(email) && !excludeSet.has(email.toLowerCase())) {
                recipients.push({ email });
            }
        }
    } else if (campaign.audienceType === 'segment' && campaign.audienceSegmentId) {
        // Get segment and filter customers
        const segmentDoc = await db.doc(`users/${userId}/projects/${projectId}/emailAudiences/${campaign.audienceSegmentId}`).get();
        
        if (segmentDoc.exists) {
            const segment = segmentDoc.data();
            const customersSnapshot = await buildSegmentQuery(userId, projectId, segment).get();
            
            for (const doc of customersSnapshot.docs) {
                const customer = doc.data();
                if (customer.email && 
                    customer.acceptsMarketing !== false && 
                    !excludeSet.has(customer.email.toLowerCase())) {
                    recipients.push({
                        email: customer.email,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        customerId: doc.id,
                    });
                }
            }
        }
    } else {
        // All customers who accept marketing (check stores for ecommerce customers)
        const customersSnapshot = await db
            .collection(`users/${userId}/stores/${projectId}/customers`)
            .where('acceptsMarketing', '==', true)
            .get();

        for (const doc of customersSnapshot.docs) {
            const customer = doc.data();
            if (customer.email && !excludeSet.has(customer.email.toLowerCase())) {
                recipients.push({
                    email: customer.email,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    customerId: doc.id,
                });
            }
        }
    }

    return recipients;
}

/**
 * Build Firestore query for segment filters
 */
function buildSegmentQuery(userId: string, projectId: string, segment: any) {
    // Customers are in stores (ecommerce), using projectId as storeId
    let query: admin.firestore.Query = db.collection(`users/${userId}/stores/${projectId}/customers`);

    // Apply basic filters
    if (segment.acceptsMarketing !== undefined) {
        query = query.where('acceptsMarketing', '==', segment.acceptsMarketing);
    }

    if (segment.minOrders !== undefined) {
        query = query.where('totalOrders', '>=', segment.minOrders);
    }

    if (segment.minTotalSpent !== undefined) {
        query = query.where('totalSpent', '>=', segment.minTotalSpent);
    }

    // Note: Complex filters like lastOrderDaysAgo would need to be done in memory
    // after fetching, or using a calculated field

    return query;
}

/**
 * Send campaign emails in batches
 */
async function sendCampaignEmails(params: {
    campaign: CampaignData;
    recipients: RecipientData[];
    fromEmail: string;
    fromName: string;
    userId: string;
    projectId: string;
}): Promise<SendCampaignResult> {
    const { campaign, recipients, fromEmail, fromName, userId, projectId } = params;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 50
    const batchSize = 50;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const emailPromises = batch.map(async (recipient) => {
            try {
                // Personalize content
                const personalizedHtml = renderTemplate(campaign.htmlContent || `<p>${campaign.subject}</p>`, {
                    firstName: recipient.firstName || '',
                    lastName: recipient.lastName || '',
                    email: recipient.email,
                    unsubscribeUrl: `https://quimera.ai/unsubscribe?email=${encodeURIComponent(recipient.email)}&project=${projectId}`,
                });

                const result = await sendEmail({
                    to: recipient.email,
                    subject: campaign.subject,
                    html: personalizedHtml,
                    from: `${fromName} <${fromEmail}>`,
                    tags: [
                        { name: 'type', value: 'marketing' },
                        { name: 'campaign', value: campaign.id },
                        { name: 'project', value: projectId },
                    ],
                });

                if (result.success) {
                    sent++;
                    
                    // Log successful send (using projects path)
                    await db.collection(`users/${userId}/projects/${projectId}/emailLogs`).add({
                        type: 'marketing',
                        templateId: 'campaign',
                        campaignId: campaign.id,
                        recipientEmail: recipient.email,
                        recipientName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
                        customerId: recipient.customerId,
                        subject: campaign.subject,
                        status: 'sent',
                        providerMessageId: result.messageId,
                        provider: 'resend',
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
                    failed++;
                    errors.push(`${recipient.email}: ${result.error}`);
                }
            } catch (err: any) {
                failed++;
                errors.push(`${recipient.email}: ${err.message}`);
            }
        });

        await Promise.all(emailPromises);

        // Small delay between batches to respect rate limits
        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return {
        success: failed === 0,
        totalRecipients: recipients.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error list
    };
}

// =============================================================================
// SCHEDULED CAMPAIGNS
// =============================================================================

/**
 * Process scheduled campaigns
 * Runs every 5 minutes via Cloud Scheduler
 */
export const processScheduledCampaigns = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
        const now = admin.firestore.Timestamp.now();

        // Find all scheduled campaigns that should be sent
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            // Check projects for email campaigns
            const projectsSnapshot = await db.collection(`users/${userDoc.id}/projects`).get();

            for (const projectDoc of projectsSnapshot.docs) {
                const campaignsSnapshot = await db
                    .collection(`users/${userDoc.id}/projects/${projectDoc.id}/emailCampaigns`)
                    .where('status', '==', 'scheduled')
                    .where('scheduledAt', '<=', now)
                    .get();

                for (const campaignDoc of campaignsSnapshot.docs) {
                    try {
                        // Call sendCampaign logic
                        console.log(`Processing scheduled campaign: ${campaignDoc.id}`);
                        
                        const campaign = campaignDoc.data() as CampaignData;
                        campaign.id = campaignDoc.id;

                        // Get recipients and send
                        const recipients = await getRecipients(userDoc.id, projectDoc.id, campaign);

                        if (recipients.length > 0) {
                            const emailSettingsDoc = await db.doc(`users/${userDoc.id}/projects/${projectDoc.id}/settings/email`).get();
                            const emailSettings = emailSettingsDoc.data() || {};

                            const projectDataDoc = await db.doc(`users/${userDoc.id}/projects/${projectDoc.id}`).get();
                            const projectData = projectDataDoc.data() || {};

                            await campaignDoc.ref.update({ status: 'sending' });

                            const result = await sendCampaignEmails({
                                campaign,
                                recipients,
                                fromEmail: emailSettings.fromEmail || 'noreply@quimera.ai',
                                fromName: emailSettings.fromName || projectData.name || 'Quimera',
                                userId: userDoc.id,
                                projectId: projectDoc.id,
                            });

                            await campaignDoc.ref.update({
                                status: 'sent',
                                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                                'stats.totalRecipients': recipients.length,
                                'stats.sent': result.sent,
                                'stats.bounced': result.failed,
                            });
                        } else {
                            await campaignDoc.ref.update({
                                status: 'sent',
                                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                                'stats.totalRecipients': 0,
                                'stats.sent': 0,
                            });
                        }
                    } catch (error: any) {
                        console.error(`Error processing campaign ${campaignDoc.id}:`, error);
                        await campaignDoc.ref.update({
                            status: 'draft',
                            lastError: error.message,
                        });
                    }
                }
            }
        }

        return null;
    });

// =============================================================================
// TEST EMAIL
// =============================================================================

/**
 * Send a test email for a campaign
 */
export const sendTestEmail = functions.https.onCall(async (data: {
    userId: string;
    storeId: string;  // Note: This is actually projectId from frontend
    campaignId: string;
    testEmail: string;
}, context) => {
    if (!context.auth || context.auth.uid !== data.userId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    const { userId, storeId: projectId, campaignId, testEmail } = data;

    if (!isValidEmail(testEmail)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
    }

    try {
        // Use projects path (frontend uses projects, not stores)
        const campaignDoc = await db.doc(`users/${userId}/projects/${projectId}/emailCampaigns/${campaignId}`).get();
        
        if (!campaignDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Campaign not found');
        }

        const campaign = campaignDoc.data() as CampaignData;

        const emailSettingsDoc = await db.doc(`users/${userId}/projects/${projectId}/settings/email`).get();
        const emailSettings = emailSettingsDoc.data() || {};

        const projectDoc = await db.doc(`users/${userId}/projects/${projectId}`).get();
        const projectSettings = projectDoc.data() || {};

        const testHtml = renderTemplate(campaign.htmlContent || `<p>${campaign.subject}</p>`, {
            firstName: 'Test',
            lastName: 'User',
            email: testEmail,
            unsubscribeUrl: '#',
        });

        const result = await sendEmail({
            to: testEmail,
            subject: `[TEST] ${campaign.subject}`,
            html: testHtml,
            from: `${emailSettings.fromName || projectSettings.name || 'Quimera'} <${emailSettings.fromEmail || 'noreply@quimera.ai'}>`,
        });

        return {
            success: result.success,
            error: result.error,
        };
    } catch (error: any) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});




