/**
 * Message Processor
 * Common logic for processing incoming messages and generating AI responses
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CONFIG } from '../config';

// Initialize Firestore if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// TYPES
// =============================================================================

export type SocialChannel = 'facebook' | 'whatsapp' | 'instagram' | 'web';

export interface IncomingMessage {
    channel: SocialChannel;
    senderId: string;
    senderName?: string;
    message: string;
    messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
    mediaUrl?: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface ProcessedResponse {
    success: boolean;
    response?: string;
    shouldEscalate?: boolean;
    escalationReason?: string;
    confidence?: number;
    error?: string;
}

export interface ProjectChatConfig {
    projectId: string;
    userId: string;
    agentName: string;
    tone: string;
    businessProfile: string;
    productsServices: string;
    policiesContact: string;
    specialInstructions: string;
    faqs: Array<{ question: string; answer: string }>;
    language: string;
}

// =============================================================================
// MESSAGE PROCESSOR
// =============================================================================

/**
 * Process incoming message and generate AI response
 */
export const processIncomingMessage = functions.https.onCall(async (data, context) => {
    const { projectId, message } = data as {
        projectId: string;
        message: IncomingMessage;
    };

    if (!projectId || !message) {
        return { success: false, error: 'Missing projectId or message' };
    }

    try {
        // Find project and its owner
        const projectConfig = await getProjectChatConfig(projectId);
        
        if (!projectConfig) {
            return { 
                success: false, 
                error: 'Project not found or chat not configured',
                shouldEscalate: true 
            };
        }

        // Store incoming message
        await storeMessage(projectId, message, 'inbound');

        // Get conversation history for context
        const conversationHistory = await getConversationHistory(
            projectId, 
            message.senderId, 
            message.channel
        );

        // Generate AI response
        const response = await generateAIResponse(
            projectConfig,
            message,
            conversationHistory
        );

        // Store outbound message
        if (response.success && response.response) {
            await storeMessage(projectId, {
                channel: message.channel,
                senderId: 'ai',
                senderName: projectConfig.agentName,
                message: response.response,
                messageType: 'text',
                timestamp: Date.now(),
            }, 'outbound', message.senderId);
        }

        return response;

    } catch (error: any) {
        console.error('Error processing message:', error);
        return {
            success: false,
            error: error.message || 'Unknown error',
            shouldEscalate: true,
            escalationReason: 'Processing error'
        };
    }
});

/**
 * Send outbound message to social channel
 */
export const sendOutboundMessage = functions.https.onCall(async (data, context) => {
    const { projectId, channel, recipientId, message, messageType } = data as {
        projectId: string;
        channel: SocialChannel;
        recipientId: string;
        message: string;
        messageType?: string;
    };

    if (!projectId || !channel || !recipientId || !message) {
        return { success: false, error: 'Missing required fields' };
    }

    try {
        // Get channel configuration
        const channelConfig = await getChannelConfig(projectId, channel);
        
        if (!channelConfig || !channelConfig.enabled) {
            return { success: false, error: `${channel} channel not configured or disabled` };
        }

        // Send message based on channel
        let result;
        switch (channel) {
            case 'facebook':
                result = await sendFacebookMessage(channelConfig, recipientId, message);
                break;
            case 'whatsapp':
                result = await sendWhatsAppMessage(channelConfig, recipientId, message);
                break;
            case 'instagram':
                result = await sendInstagramMessage(channelConfig, recipientId, message);
                break;
            default:
                return { success: false, error: 'Unsupported channel' };
        }

        // Store outbound message
        await storeMessage(projectId, {
            channel,
            senderId: 'business',
            message,
            messageType: messageType as any || 'text',
            timestamp: Date.now(),
        }, 'outbound', recipientId);

        return result;

    } catch (error: any) {
        console.error('Error sending outbound message:', error);
        return { success: false, error: error.message };
    }
});

// =============================================================================
// AI RESPONSE GENERATION
// =============================================================================

async function generateAIResponse(
    config: ProjectChatConfig,
    message: IncomingMessage,
    conversationHistory: Array<{ role: string; content: string }>
): Promise<ProcessedResponse> {
    const apiKey = GEMINI_CONFIG.apiKey;
    
    if (!apiKey) {
        console.error('Gemini API key not configured');
        return {
            success: false,
            error: 'AI not configured',
            shouldEscalate: true,
            escalationReason: 'AI service unavailable'
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Build system prompt
        const systemPrompt = buildSystemPrompt(config, message.channel);

        // Build conversation context
        const conversationContext = conversationHistory
            .map(msg => `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        // Build full prompt
        const fullPrompt = `${systemPrompt}

CONVERSATION HISTORY:
${conversationContext || 'No previous messages'}

CURRENT MESSAGE FROM CUSTOMER (via ${message.channel}):
${message.message}

YOUR RESPONSE:`;

        // Generate response
        const result = await model.generateContent(fullPrompt);
        const response = result.response.text();

        // Check if response suggests escalation
        const shouldEscalate = checkForEscalation(response, message.message);

        return {
            success: true,
            response: response.trim(),
            shouldEscalate,
            escalationReason: shouldEscalate ? 'Complex issue detected' : undefined,
            confidence: 0.85 // Could be improved with more sophisticated analysis
        };

    } catch (error: any) {
        console.error('Error generating AI response:', error);
        return {
            success: false,
            error: error.message,
            shouldEscalate: true,
            escalationReason: 'AI generation failed'
        };
    }
}

function buildSystemPrompt(config: ProjectChatConfig, channel: SocialChannel): string {
    const channelInstructions: Record<SocialChannel, string> = {
        facebook: 'Keep responses concise and friendly. Use emojis sparingly but appropriately.',
        whatsapp: 'Keep responses brief and clear. WhatsApp users prefer quick, helpful responses.',
        instagram: 'Be casual and engaging. Instagram users appreciate a friendly, relatable tone.',
        web: 'Provide comprehensive responses. Web chat users may expect more detailed information.',
    };

    return `You are ${config.agentName}, a ${config.tone.toLowerCase()} AI assistant.

BUSINESS INFORMATION:
${config.businessProfile}

PRODUCTS/SERVICES:
${config.productsServices}

POLICIES & CONTACT:
${config.policiesContact}

${config.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${config.specialInstructions}` : ''}

${config.faqs.length > 0 ? `FREQUENTLY ASKED QUESTIONS:\n${config.faqs.map((faq, i) => `Q${i + 1}: ${faq.question}\nA${i + 1}: ${faq.answer}`).join('\n\n')}` : ''}

CHANNEL-SPECIFIC INSTRUCTIONS (${channel.toUpperCase()}):
${channelInstructions[channel]}

LANGUAGE: Respond in ${config.language}. If the customer writes in a different language, respond in their language.

IMPORTANT RULES:
1. Be helpful, accurate, and professional
2. If you don't know something, say so honestly
3. For complex issues (refunds, complaints, technical problems), offer to connect with a human
4. Never make up information or prices
5. Keep responses appropriate for ${channel} messaging`;
}

function checkForEscalation(response: string, userMessage: string): boolean {
    // Keywords that suggest escalation might be needed
    const escalationKeywords = [
        'speak to a human', 'talk to someone', 'manager', 'supervisor',
        'refund', 'complaint', 'legal', 'urgent', 'emergency',
        'hablar con alguien', 'reembolso', 'queja', 'urgente',
        'not satisfied', 'very upset', 'frustrated'
    ];

    const combinedText = `${response} ${userMessage}`.toLowerCase();
    return escalationKeywords.some(keyword => combinedText.includes(keyword));
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

async function getProjectChatConfig(projectId: string): Promise<ProjectChatConfig | null> {
    try {
        // Find project across all users
        const usersSnapshot = await db.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const projectRef = db.collection('users').doc(userDoc.id).collection('projects').doc(projectId);
            const projectDoc = await projectRef.get();
            
            if (projectDoc.exists) {
                const projectData = projectDoc.data();
                const aiConfig = projectData?.aiAssistantConfig;
                
                if (!aiConfig) return null;

                return {
                    projectId,
                    userId: userDoc.id,
                    agentName: aiConfig.agentName || 'AI Assistant',
                    tone: aiConfig.tone || 'Professional',
                    businessProfile: aiConfig.businessProfile || '',
                    productsServices: aiConfig.productsServices || '',
                    policiesContact: aiConfig.policiesContact || '',
                    specialInstructions: aiConfig.specialInstructions || '',
                    faqs: aiConfig.faqs || [],
                    language: projectData?.brandIdentity?.language || 'English',
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting project config:', error);
        return null;
    }
}

async function getChannelConfig(projectId: string, channel: SocialChannel): Promise<any> {
    try {
        // Find project and get channel config
        const usersSnapshot = await db.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const projectRef = db.collection('users').doc(userDoc.id).collection('projects').doc(projectId);
            const projectDoc = await projectRef.get();
            
            if (projectDoc.exists) {
                const aiConfig = projectDoc.data()?.aiAssistantConfig;
                return aiConfig?.socialChannels?.[channel] || null;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting channel config:', error);
        return null;
    }
}

async function storeMessage(
    projectId: string, 
    message: IncomingMessage, 
    direction: 'inbound' | 'outbound',
    recipientId?: string
): Promise<void> {
    try {
        const messagesRef = db.collection('socialMessages');
        await messagesRef.add({
            projectId,
            channel: message.channel,
            direction,
            senderId: message.senderId,
            senderName: message.senderName,
            recipientId,
            message: message.message,
            messageType: message.messageType,
            mediaUrl: message.mediaUrl,
            timestamp: admin.firestore.Timestamp.fromMillis(message.timestamp),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Error storing message:', error);
    }
}

async function getConversationHistory(
    projectId: string,
    participantId: string,
    channel: SocialChannel,
    limit: number = 10
): Promise<Array<{ role: string; content: string }>> {
    try {
        const messagesRef = db.collection('socialMessages');
        const snapshot = await messagesRef
            .where('projectId', '==', projectId)
            .where('channel', '==', channel)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const messages = snapshot.docs
            .filter(doc => {
                const data = doc.data();
                return data.senderId === participantId || data.recipientId === participantId;
            })
            .map(doc => {
                const data = doc.data();
                return {
                    role: data.direction === 'inbound' ? 'user' : 'assistant',
                    content: data.message,
                };
            })
            .reverse();

        return messages;
    } catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
    }
}

// =============================================================================
// CHANNEL-SPECIFIC SEND FUNCTIONS
// =============================================================================

async function sendFacebookMessage(config: any, recipientId: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${config.pageAccessToken}`,
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
            return { success: false, error: data.error.message };
        }

        return { success: true, messageId: data.message_id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function sendWhatsAppMessage(config: any, recipientId: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.accessToken}`,
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
            return { success: false, error: data.error.message };
        }

        return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function sendInstagramMessage(config: any, recipientId: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${config.accessToken}`,
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
            return { success: false, error: data.error.message };
        }

        return { success: true, messageId: data.message_id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


