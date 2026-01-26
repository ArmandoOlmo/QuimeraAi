/**
 * Facebook Messenger Webhook
 * Handles incoming messages from Facebook Messenger
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GEMINI_CONFIG } from '../config';

// Initialize Firestore if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Verify token - MUST match what you set in Meta Developer Portal
const VERIFY_TOKEN = 'quimera_verify_token_2024';

// =============================================================================
// COMBINED WEBHOOK (Handles both GET verification and POST messages)
// =============================================================================

/**
 * Facebook Messenger Webhook - Combined endpoint
 * GET: Webhook verification from Meta
 * POST: Incoming messages from Messenger
 */
export const facebookMessengerWebhook = functions.https.onRequest(async (req, res) => {
    console.log(`[Facebook Webhook] ${req.method} request received`);

    // =========================================================================
    // GET: Webhook Verification
    // =========================================================================
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        console.log('[Facebook Webhook] Verification attempt:', { mode, token: token ? '***' : 'missing' });

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[Facebook Webhook] ✅ Verification successful');
            res.status(200).send(challenge);
        } else {
            console.error('[Facebook Webhook] ❌ Verification failed - token mismatch');
            res.sendStatus(403);
        }
        return;
    }

    // =========================================================================
    // POST: Incoming Messages
    // =========================================================================
    if (req.method === 'POST') {
        const body = req.body;

        // Verify this is from a Page subscription
        if (body.object !== 'page') {
            console.log('[Facebook Webhook] Not a page event, ignoring');
            res.sendStatus(404);
            return;
        }

        // Send 200 immediately to acknowledge receipt (Meta requires fast response)
        res.status(200).send('EVENT_RECEIVED');

        // Process entries asynchronously
        try {
            for (const entry of body.entry || []) {
                await processEntry(entry);
            }
        } catch (error) {
            console.error('[Facebook Webhook] Error processing:', error);
        }
        return;
    }

    // Other methods not allowed
    res.sendStatus(405);
});

// Legacy exports for backwards compatibility
export const facebookWebhookVerify = facebookMessengerWebhook;
export const facebookWebhook = facebookMessengerWebhook;

// =============================================================================
// MESSAGE PROCESSING
// =============================================================================

async function processEntry(entry: any): Promise<void> {
    const pageId = entry.id;
    const timestamp = entry.time;

    // Get messaging events
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
        try {
            await processMessagingEvent(pageId, event);
        } catch (error) {
            console.error('Error processing messaging event:', error);
        }
    }
}

async function processMessagingEvent(pageId: string, event: any): Promise<void> {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const timestamp = event.timestamp;

    if (!senderId) {
        console.log('No sender ID in event');
        return;
    }

    // Find project associated with this page
    const projectConfig = await findProjectByPageId(pageId);
    
    if (!projectConfig) {
        console.log(`No project found for page ID: ${pageId}`);
        return;
    }

    // Handle different event types
    if (event.message) {
        await handleMessage(projectConfig, senderId, event.message, timestamp);
    } else if (event.postback) {
        await handlePostback(projectConfig, senderId, event.postback, timestamp);
    } else if (event.delivery) {
        await handleDelivery(projectConfig, senderId, event.delivery);
    } else if (event.read) {
        await handleRead(projectConfig, senderId, event.read);
    }
}

async function handleMessage(
    projectConfig: any,
    senderId: string,
    message: any,
    timestamp: number
): Promise<void> {
    console.log(`Facebook message from ${senderId}: ${message.text || '[attachment]'}`);

    // Skip echo messages
    if (message.is_echo) {
        return;
    }

    // Get sender profile (optional)
    const senderProfile = await getSenderProfile(senderId, projectConfig.pageAccessToken);

    // Store incoming message
    await storeMessage(projectConfig.projectId, {
        channel: 'facebook',
        direction: 'inbound',
        senderId,
        senderName: senderProfile?.name,
        message: message.text || '[Media message]',
        messageType: message.attachments ? 'image' : 'text',
        mediaUrl: message.attachments?.[0]?.payload?.url,
        timestamp,
        messageId: message.mid,
    });

    // Process with AI if text message
    if (message.text) {
        const aiResponse = await generateAndSendResponse(
            projectConfig,
            senderId,
            message.text,
            senderProfile?.name
        );

        if (!aiResponse.success) {
            console.error('Failed to generate AI response:', aiResponse.error);
        }
    }

    // Handle quick reply
    if (message.quick_reply) {
        console.log('Quick reply payload:', message.quick_reply.payload);
        // Handle based on payload
    }
}

async function handlePostback(
    projectConfig: any,
    senderId: string,
    postback: any,
    timestamp: number
): Promise<void> {
    console.log(`Facebook postback from ${senderId}: ${postback.payload}`);

    // Get sender profile
    const senderProfile = await getSenderProfile(senderId, projectConfig.pageAccessToken);

    // Store postback as message
    await storeMessage(projectConfig.projectId, {
        channel: 'facebook',
        direction: 'inbound',
        senderId,
        senderName: senderProfile?.name,
        message: `[Postback: ${postback.title || postback.payload}]`,
        messageType: 'text',
        timestamp,
        metadata: { payload: postback.payload },
    });

    // Generate response based on postback payload
    // This could be customized based on the payload type
    const aiResponse = await generateAndSendResponse(
        projectConfig,
        senderId,
        postback.title || postback.payload,
        senderProfile?.name
    );
}

async function handleDelivery(projectConfig: any, senderId: string, delivery: any): Promise<void> {
    // Update message status to delivered
    const messageIds = delivery.mids || [];
    for (const mid of messageIds) {
        await updateMessageStatus(projectConfig.projectId, mid, 'delivered');
    }
}

async function handleRead(projectConfig: any, senderId: string, read: any): Promise<void> {
    // Update messages before watermark to read
    const watermark = read.watermark;
    await updateMessagesReadBefore(projectConfig.projectId, senderId, watermark);
}

// =============================================================================
// AI RESPONSE GENERATION
// =============================================================================

async function generateAndSendResponse(
    projectConfig: any,
    senderId: string,
    userMessage: string,
    senderName?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get AI config
        const aiConfig = projectConfig.aiAssistantConfig;
        
        if (!aiConfig || !aiConfig.isActive) {
            return { success: false, error: 'AI assistant not active' };
        }

        // Get conversation history
        const history = await getConversationHistory(projectConfig.projectId, senderId);

        // Generate AI response using Cloud Function
        const { processIncomingMessage } = await import('./messageProcessor');
        
        // Call the processor
        const response = await processMessageInternal(projectConfig, {
            channel: 'facebook',
            senderId,
            senderName,
            message: userMessage,
            messageType: 'text',
            timestamp: Date.now(),
        }, history);

        if (response.success && response.response) {
            // Send response to Facebook
            await sendFacebookMessage(
                projectConfig.pageAccessToken,
                senderId,
                response.response
            );

            // Store outbound message
            await storeMessage(projectConfig.projectId, {
                channel: 'facebook',
                direction: 'outbound',
                senderId: 'ai',
                senderName: aiConfig.agentName,
                recipientId: senderId,
                message: response.response,
                messageType: 'text',
                timestamp: Date.now(),
            });
        }

        return { success: true };

    } catch (error: any) {
        console.error('Error generating response:', error);
        return { success: false, error: error.message };
    }
}

async function processMessageInternal(
    projectConfig: any,
    message: any,
    history: any[]
): Promise<{ success: boolean; response?: string; error?: string }> {
    // Import Gemini (lazily to avoid cold start issues)
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const apiKey = GEMINI_CONFIG.apiKey;
    if (!apiKey) {
        console.error('[Facebook Webhook] GEMINI_API_KEY not configured');
        return { success: false, error: 'AI not configured' };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const aiConfig = projectConfig.aiAssistantConfig;
        
        // Build prompt
        const systemPrompt = `You are ${aiConfig.agentName}, a ${aiConfig.tone?.toLowerCase() || 'professional'} AI assistant.

BUSINESS PROFILE:
${aiConfig.businessProfile || 'A helpful business assistant.'}

PRODUCTS/SERVICES:
${aiConfig.productsServices || 'Various products and services.'}

POLICIES & CONTACT:
${aiConfig.policiesContact || ''}

${aiConfig.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${aiConfig.specialInstructions}` : ''}

CHANNEL: Facebook Messenger
- Keep responses concise and friendly
- Use emojis sparingly but appropriately
- Be conversational and helpful

IMPORTANT: Respond in the same language the user is using.`;

        const conversationContext = history
            .map(msg => `${msg.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${msg.message}`)
            .join('\n');

        const fullPrompt = `${systemPrompt}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}
CUSTOMER: ${message.message}

YOUR RESPONSE:`;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text().trim();

        return { success: true, response: responseText };

    } catch (error: any) {
        console.error('AI generation error:', error);
        return { success: false, error: error.message };
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function findProjectByPageId(pageId: string): Promise<any | null> {
    try {
        const usersSnapshot = await db.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const projectsSnapshot = await db
                .collection('users')
                .doc(userDoc.id)
                .collection('projects')
                .get();
            
            for (const projectDoc of projectsSnapshot.docs) {
                const data = projectDoc.data();
                const fbConfig = data.aiAssistantConfig?.socialChannels?.facebook;
                
                if (fbConfig?.pageId === pageId && fbConfig?.enabled) {
                    return {
                        projectId: projectDoc.id,
                        userId: userDoc.id,
                        pageAccessToken: fbConfig.pageAccessToken,
                        aiAssistantConfig: data.aiAssistantConfig,
                        ...data,
                    };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding project:', error);
        return null;
    }
}

async function getSenderProfile(senderId: string, accessToken: string): Promise<{ name?: string; profilePic?: string } | null> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${senderId}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`
        );
        const data = await response.json();
        
        if (data.error) {
            console.warn('Error getting sender profile:', data.error);
            return null;
        }
        
        return {
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            profilePic: data.profile_pic,
        };
    } catch (error) {
        console.warn('Error fetching sender profile:', error);
        return null;
    }
}

async function sendFacebookMessage(accessToken: string, recipientId: string, message: string): Promise<void> {
    const response = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text: message },
            }),
        }
    );

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message);
    }
}

async function storeMessage(projectId: string, messageData: any): Promise<void> {
    try {
        await db.collection('socialMessages').add({
            projectId,
            ...messageData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Error storing message:', error);
    }
}

async function getConversationHistory(projectId: string, senderId: string, limit: number = 10): Promise<any[]> {
    try {
        const snapshot = await db
            .collection('socialMessages')
            .where('projectId', '==', projectId)
            .where('channel', '==', 'facebook')
            .orderBy('timestamp', 'desc')
            .limit(limit * 2) // Get more to filter
            .get();

        return snapshot.docs
            .filter(doc => {
                const data = doc.data();
                return data.senderId === senderId || data.recipientId === senderId;
            })
            .map(doc => doc.data())
            .slice(0, limit)
            .reverse();
    } catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
    }
}

async function updateMessageStatus(projectId: string, messageId: string, status: string): Promise<void> {
    try {
        const snapshot = await db
            .collection('socialMessages')
            .where('projectId', '==', projectId)
            .where('messageId', '==', messageId)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            await snapshot.docs[0].ref.update({ status });
        }
    } catch (error) {
        console.error('Error updating message status:', error);
    }
}

async function updateMessagesReadBefore(projectId: string, senderId: string, watermark: number): Promise<void> {
    try {
        const snapshot = await db
            .collection('socialMessages')
            .where('projectId', '==', projectId)
            .where('recipientId', '==', senderId)
            .where('direction', '==', 'outbound')
            .where('timestamp', '<=', watermark)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'read' });
        });
        await batch.commit();
    } catch (error) {
        console.error('Error updating read status:', error);
    }
}


