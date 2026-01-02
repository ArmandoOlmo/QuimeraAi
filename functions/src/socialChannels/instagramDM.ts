/**
 * Instagram DM Webhook
 * Handles incoming direct messages from Instagram
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { META_CONFIG, GEMINI_CONFIG } from '../config';

// Initialize Firestore if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

/**
 * Instagram webhook verification endpoint
 */
export const instagramWebhookVerify = functions.https.onRequest((req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = META_CONFIG.verifyToken;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('Instagram webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error('Instagram webhook verification failed');
        res.sendStatus(403);
    }
});

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * Instagram webhook handler - Combined endpoint for GET (verification) and POST (messages)
 */
export const instagramWebhook = functions.https.onRequest(async (req, res) => {
    console.log(`[Instagram Webhook] ${req.method} request received`);

    // =========================================================================
    // GET: Webhook Verification
    // =========================================================================
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Use same verify token as other channels
        const verifyToken = META_CONFIG.verifyToken;

        console.log('[Instagram Webhook] Verification attempt:', { mode, token: token ? '***' : 'missing' });

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('[Instagram Webhook] ✅ Verification successful');
            res.status(200).send(challenge);
        } else {
            console.error('[Instagram Webhook] ❌ Verification failed - token mismatch');
            res.sendStatus(403);
        }
        return;
    }

    // =========================================================================
    // POST: Incoming Messages
    // =========================================================================
    if (req.method === 'POST') {
        const body = req.body;

        // Verify this is from Instagram
        if (body.object !== 'instagram') {
            console.log('[Instagram Webhook] Not an Instagram event, ignoring');
            res.sendStatus(404);
            return;
        }

        // Send 200 immediately
        res.status(200).send('EVENT_RECEIVED');

        // Process entries asynchronously
        try {
            for (const entry of body.entry || []) {
                await processEntry(entry);
            }
        } catch (error) {
            console.error('Error processing Instagram webhook:', error);
        }
        return;
    }

    // Other methods not allowed
    res.sendStatus(405);
});

// =============================================================================
// MESSAGE PROCESSING
// =============================================================================

async function processEntry(entry: any): Promise<void> {
    const instagramAccountId = entry.id;
    const timestamp = entry.time;
    const messagingEvents = entry.messaging || [];

    // Find project
    const projectConfig = await findProjectByInstagramId(instagramAccountId);
    
    if (!projectConfig) {
        console.log(`No project found for Instagram ID: ${instagramAccountId}`);
        return;
    }

    for (const event of messagingEvents) {
        try {
            await processMessagingEvent(projectConfig, event);
        } catch (error) {
            console.error('Error processing messaging event:', error);
        }
    }
}

async function processMessagingEvent(projectConfig: any, event: any): Promise<void> {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const timestamp = event.timestamp;

    if (!senderId) return;

    if (event.message) {
        await handleMessage(projectConfig, senderId, event.message, timestamp);
    } else if (event.postback) {
        await handlePostback(projectConfig, senderId, event.postback, timestamp);
    } else if (event.reaction) {
        await handleReaction(projectConfig, senderId, event.reaction);
    }
}

async function handleMessage(
    projectConfig: any,
    senderId: string,
    message: any,
    timestamp: number
): Promise<void> {
    console.log(`Instagram message from ${senderId}: ${message.text || '[media]'}`);

    // Skip echo messages
    if (message.is_echo) {
        return;
    }

    // Extract message content
    let messageContent = '';
    let messageType: 'text' | 'image' | 'video' | 'audio' = 'text';
    let mediaUrl: string | undefined;

    if (message.text) {
        messageContent = message.text;
        messageType = 'text';
    } else if (message.attachments) {
        const attachment = message.attachments[0];
        messageType = attachment.type as any;
        mediaUrl = attachment.payload?.url;
        
        switch (attachment.type) {
            case 'image':
                messageContent = '[Image]';
                break;
            case 'video':
                messageContent = '[Video]';
                break;
            case 'audio':
                messageContent = '[Audio]';
                break;
            case 'share':
                messageContent = '[Shared post]';
                break;
            case 'story_mention':
                messageContent = '[Story mention]';
                break;
            default:
                messageContent = '[Media]';
        }
    }

    // Store incoming message
    await storeMessage(projectConfig.projectId, {
        channel: 'instagram',
        direction: 'inbound',
        senderId,
        message: messageContent,
        messageType,
        mediaUrl,
        timestamp,
        messageId: message.mid,
    });

    // Process with AI if text message
    if (message.text) {
        await generateAndSendResponse(projectConfig, senderId, message.text);
    }

    // Handle quick reply
    if (message.quick_reply) {
        console.log('Instagram quick reply:', message.quick_reply.payload);
    }
}

async function handlePostback(
    projectConfig: any,
    senderId: string,
    postback: any,
    timestamp: number
): Promise<void> {
    console.log(`Instagram postback from ${senderId}: ${postback.payload}`);

    await storeMessage(projectConfig.projectId, {
        channel: 'instagram',
        direction: 'inbound',
        senderId,
        message: `[Postback: ${postback.title || postback.payload}]`,
        messageType: 'text',
        timestamp,
    });

    // Generate response for postback
    await generateAndSendResponse(projectConfig, senderId, postback.title || postback.payload);
}

async function handleReaction(projectConfig: any, senderId: string, reaction: any): Promise<void> {
    console.log(`Instagram reaction from ${senderId}: ${reaction.reaction || reaction.emoji}`);
    
    // Store reaction (optional)
    if (reaction.action === 'react') {
        await storeMessage(projectConfig.projectId, {
            channel: 'instagram',
            direction: 'inbound',
            senderId,
            message: `[Reacted with ${reaction.emoji || reaction.reaction}]`,
            messageType: 'text',
            timestamp: Date.now(),
            metadata: { reaction: true, emoji: reaction.emoji || reaction.reaction },
        });
    }
}

// =============================================================================
// AI RESPONSE GENERATION
// =============================================================================

async function generateAndSendResponse(
    projectConfig: any,
    senderId: string,
    userMessage: string
): Promise<void> {
    try {
        const aiConfig = projectConfig.aiAssistantConfig;
        
        if (!aiConfig || !aiConfig.isActive) {
            console.log('AI assistant not active');
            return;
        }

        // Get conversation history
        const history = await getConversationHistory(projectConfig.projectId, senderId);

        // Generate AI response
        const response = await processMessageInternal(projectConfig, userMessage, history);

        if (response.success && response.response) {
            // Send response via Instagram
            await sendInstagramMessage(
                projectConfig.accessToken,
                senderId,
                response.response
            );

            // Store outbound message
            await storeMessage(projectConfig.projectId, {
                channel: 'instagram',
                direction: 'outbound',
                senderId: 'ai',
                senderName: aiConfig.agentName,
                recipientId: senderId,
                message: response.response,
                messageType: 'text',
                timestamp: Date.now(),
            });
        }
    } catch (error) {
        console.error('Error generating response:', error);
    }
}

async function processMessageInternal(
    projectConfig: any,
    userMessage: string,
    history: any[]
): Promise<{ success: boolean; response?: string }> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Use environment variable (from .env) or fallback to functions.config()
    const apiKey = GEMINI_CONFIG.apiKey;
    if (!apiKey) {
        return { success: false };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const aiConfig = projectConfig.aiAssistantConfig;
        
        const systemPrompt = `You are ${aiConfig.agentName}, a ${aiConfig.tone?.toLowerCase() || 'professional'} AI assistant.

BUSINESS PROFILE:
${aiConfig.businessProfile || 'A helpful business assistant.'}

PRODUCTS/SERVICES:
${aiConfig.productsServices || ''}

POLICIES & CONTACT:
${aiConfig.policiesContact || ''}

${aiConfig.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${aiConfig.specialInstructions}` : ''}

CHANNEL: Instagram DMs
- Be casual, friendly and engaging
- Instagram users appreciate a relatable, modern tone
- Keep responses concise but personable
- Feel free to use emojis appropriately 😊

IMPORTANT: Respond in the same language the user is using.`;

        const conversationContext = history
            .map(msg => `${msg.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${msg.message}`)
            .join('\n');

        const fullPrompt = `${systemPrompt}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}
CUSTOMER: ${userMessage}

YOUR RESPONSE (friendly and engaging for Instagram):`;

        const result = await model.generateContent(fullPrompt);
        return { success: true, response: result.response.text().trim() };

    } catch (error: any) {
        console.error('AI generation error:', error);
        return { success: false };
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function findProjectByInstagramId(instagramAccountId: string): Promise<any | null> {
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
                const igConfig = data.aiAssistantConfig?.socialChannels?.instagram;
                
                if (igConfig?.accountId === instagramAccountId && igConfig?.enabled) {
                    return {
                        projectId: projectDoc.id,
                        userId: userDoc.id,
                        accountId: igConfig.accountId,
                        accessToken: igConfig.accessToken,
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

async function sendInstagramMessage(accessToken: string, recipientId: string, message: string): Promise<void> {
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
            .where('channel', '==', 'instagram')
            .orderBy('timestamp', 'desc')
            .limit(limit * 2)
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


