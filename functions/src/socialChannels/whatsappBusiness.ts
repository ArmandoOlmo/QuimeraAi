/**
 * WhatsApp Business Webhook
 * Handles incoming messages from WhatsApp Business API
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
 * WhatsApp webhook verification endpoint
 */
export const whatsappWebhookVerify = functions.https.onRequest((req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = META_CONFIG.verifyToken;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('WhatsApp webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error('WhatsApp webhook verification failed');
        res.sendStatus(403);
    }
});

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * WhatsApp webhook handler - Combined endpoint for GET (verification) and POST (messages)
 */
export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
    console.log(`[WhatsApp Webhook] ${req.method} request received`);

    // =========================================================================
    // GET: Webhook Verification
    // =========================================================================
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Use same verify token as other channels
        const verifyToken = META_CONFIG.verifyToken;

        console.log('[WhatsApp Webhook] Verification attempt:', { mode, token: token ? '***' : 'missing' });

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('[WhatsApp Webhook] ✅ Verification successful');
            res.status(200).send(challenge);
        } else {
            console.error('[WhatsApp Webhook] ❌ Verification failed - token mismatch');
            res.sendStatus(403);
        }
        return;
    }

    // =========================================================================
    // POST: Incoming Messages
    // =========================================================================
    if (req.method === 'POST') {
        const body = req.body;

        // Verify this is from WhatsApp
        if (body.object !== 'whatsapp_business_account') {
            console.log('[WhatsApp Webhook] Not a WhatsApp event, ignoring');
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
            console.error('Error processing WhatsApp webhook:', error);
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
    const changes = entry.changes || [];

    for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (!phoneNumberId) continue;

        // Find project
        const projectConfig = await findProjectByPhoneNumberId(phoneNumberId);
        
        if (!projectConfig) {
            console.log(`No project found for phone number ID: ${phoneNumberId}`);
            continue;
        }

        // Process messages
        const messages = value.messages || [];
        const contacts = value.contacts || [];
        const statuses = value.statuses || [];

        for (const message of messages) {
            const contact = contacts.find((c: any) => c.wa_id === message.from);
            await handleMessage(projectConfig, message, contact);
        }

        for (const status of statuses) {
            await handleStatus(projectConfig, status);
        }
    }
}

async function handleMessage(projectConfig: any, message: any, contact: any): Promise<void> {
    const senderId = message.from;
    const senderName = contact?.profile?.name;
    const timestamp = parseInt(message.timestamp) * 1000;

    console.log(`WhatsApp message from ${senderId}: ${message.text?.body || '[media]'}`);

    // Extract message content based on type
    let messageContent = '';
    let messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' = 'text';
    let mediaUrl: string | undefined;

    switch (message.type) {
        case 'text':
            messageContent = message.text?.body || '';
            messageType = 'text';
            break;
        case 'image':
            messageContent = message.image?.caption || '[Image]';
            messageType = 'image';
            // Would need to download media using message.image.id
            break;
        case 'audio':
            messageContent = '[Audio message]';
            messageType = 'audio';
            break;
        case 'video':
            messageContent = message.video?.caption || '[Video]';
            messageType = 'video';
            break;
        case 'document':
            messageContent = message.document?.caption || `[Document: ${message.document?.filename}]`;
            messageType = 'document';
            break;
        case 'location':
            messageContent = `[Location: ${message.location?.name || 'Shared location'}]`;
            messageType = 'location';
            break;
        case 'interactive':
            // Handle button or list replies
            messageContent = message.interactive?.button_reply?.title 
                || message.interactive?.list_reply?.title 
                || '[Interactive reply]';
            break;
        case 'button':
            messageContent = message.button?.text || '[Button click]';
            break;
        default:
            messageContent = '[Unsupported message type]';
    }

    // Store incoming message
    await storeMessage(projectConfig.projectId, {
        channel: 'whatsapp',
        direction: 'inbound',
        senderId,
        senderName,
        message: messageContent,
        messageType,
        mediaUrl,
        timestamp,
        messageId: message.id,
        metadata: { waMessageType: message.type },
    });

    // Process with AI if text message
    if (message.type === 'text' && messageContent) {
        await generateAndSendResponse(projectConfig, senderId, messageContent, senderName);
    }
}

async function handleStatus(projectConfig: any, status: any): Promise<void> {
    const messageId = status.id;
    const recipientId = status.recipient_id;
    const statusType = status.status; // sent, delivered, read, failed

    await updateMessageStatus(projectConfig.projectId, messageId, statusType);

    if (status.errors) {
        console.error('WhatsApp message error:', status.errors);
    }
}

// =============================================================================
// AI RESPONSE GENERATION
// =============================================================================

async function generateAndSendResponse(
    projectConfig: any,
    senderId: string,
    userMessage: string,
    senderName?: string
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
            // Send response via WhatsApp
            await sendWhatsAppMessage(
                projectConfig.phoneNumberId,
                projectConfig.accessToken,
                senderId,
                response.response
            );

            // Store outbound message
            await storeMessage(projectConfig.projectId, {
                channel: 'whatsapp',
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

CHANNEL: WhatsApp
- Keep responses brief and clear (WhatsApp users prefer quick responses)
- Be conversational but efficient
- Use formatting sparingly (WhatsApp supports *bold* and _italic_)

IMPORTANT: Respond in the same language the user is using.`;

        const conversationContext = history
            .map(msg => `${msg.direction === 'inbound' ? 'Customer' : 'Assistant'}: ${msg.message}`)
            .join('\n');

        const fullPrompt = `${systemPrompt}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}
CUSTOMER: ${userMessage}

YOUR RESPONSE (keep it concise for WhatsApp):`;

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

async function findProjectByPhoneNumberId(phoneNumberId: string): Promise<any | null> {
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
                const waConfig = data.aiAssistantConfig?.socialChannels?.whatsapp;
                
                if (waConfig?.phoneNumberId === phoneNumberId && waConfig?.enabled) {
                    return {
                        projectId: projectDoc.id,
                        userId: userDoc.id,
                        phoneNumberId: waConfig.phoneNumberId,
                        accessToken: waConfig.accessToken,
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

async function sendWhatsAppMessage(
    phoneNumberId: string, 
    accessToken: string, 
    recipientId: string, 
    message: string
): Promise<void> {
    const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipientId,
                type: 'text',
                text: { body: message },
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
            .where('channel', '==', 'whatsapp')
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


