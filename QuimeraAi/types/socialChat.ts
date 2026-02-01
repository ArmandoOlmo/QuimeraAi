/**
 * Social Chat Types
 * Types for multi-channel messaging (Facebook, WhatsApp, Instagram)
 */

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export type SocialChannel = 'facebook' | 'whatsapp' | 'instagram' | 'web';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageDirection = 'inbound' | 'outbound';

export interface SocialMessage {
    id: string;
    projectId: string;
    channel: SocialChannel;
    direction: MessageDirection;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    recipientId?: string;
    message: string;
    messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'template';
    mediaUrl?: string;
    timestamp: { seconds: number; nanoseconds: number };
    status: MessageStatus;
    response?: string;
    responseTimestamp?: { seconds: number; nanoseconds: number };
    metadata?: Record<string, any>;
    // AI processing
    processedByAI?: boolean;
    aiConfidence?: number;
    escalatedToHuman?: boolean;
    // Error handling
    errorCode?: string;
    errorMessage?: string;
    retryCount?: number;
}

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

export interface SocialConversation {
    id: string;
    projectId: string;
    channel: SocialChannel;
    participantId: string;
    participantName?: string;
    participantAvatar?: string;
    participantEmail?: string;
    participantPhone?: string;
    status: 'active' | 'closed' | 'pending' | 'escalated';
    startedAt: { seconds: number; nanoseconds: number };
    lastMessageAt: { seconds: number; nanoseconds: number };
    messageCount: number;
    unreadCount: number;
    assignedTo?: string; // Human agent ID if escalated
    tags?: string[];
    notes?: string;
    leadId?: string; // Link to CRM lead
}

// =============================================================================
// CHANNEL CONFIGURATION
// =============================================================================

export interface FacebookMessengerConfig {
    enabled: boolean;
    pageId: string;
    pageAccessToken: string;
    appId?: string;
    appSecret?: string;
    webhookVerifyToken: string;
    // Greeting and ice breakers
    greetingText?: string;
    iceBreakers?: Array<{
        question: string;
        payload: string;
    }>;
    // Persistent menu
    persistentMenu?: Array<{
        type: 'postback' | 'web_url';
        title: string;
        payload?: string;
        url?: string;
    }>;
}

export interface WhatsAppBusinessConfig {
    enabled: boolean;
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    webhookVerifyToken: string;
    // Business profile
    businessName?: string;
    businessDescription?: string;
    businessWebsite?: string;
    businessAddress?: string;
    // Message templates (for outbound)
    templates?: Array<{
        id: string;
        name: string;
        language: string;
        category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
        components: any[];
    }>;
}

export interface InstagramDMConfig {
    enabled: boolean;
    accountId: string;
    accessToken: string;
    webhookVerifyToken: string;
    // Quick replies
    quickReplies?: Array<{
        title: string;
        payload: string;
    }>;
}

export interface SocialChannelsConfig {
    facebook?: FacebookMessengerConfig;
    whatsapp?: WhatsAppBusinessConfig;
    instagram?: InstagramDMConfig;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface WebhookEvent {
    id: string;
    channel: SocialChannel;
    eventType: string;
    timestamp: number;
    payload: any;
    processed: boolean;
    processedAt?: number;
    error?: string;
}

// Facebook Webhook Events
export interface FacebookWebhookEntry {
    id: string;
    time: number;
    messaging?: FacebookMessagingEvent[];
}

export interface FacebookMessagingEvent {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
            type: 'image' | 'audio' | 'video' | 'file' | 'location';
            payload: any;
        }>;
        quick_reply?: { payload: string };
    };
    postback?: {
        title: string;
        payload: string;
    };
    delivery?: {
        mids: string[];
        watermark: number;
    };
    read?: {
        watermark: number;
    };
}

// WhatsApp Webhook Events
export interface WhatsAppWebhookEntry {
    id: string;
    changes: Array<{
        value: {
            messaging_product: string;
            metadata: {
                display_phone_number: string;
                phone_number_id: string;
            };
            contacts?: Array<{
                profile: { name: string };
                wa_id: string;
            }>;
            messages?: WhatsAppMessage[];
            statuses?: WhatsAppStatus[];
        };
        field: string;
    }>;
}

export interface WhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive' | 'button';
    text?: { body: string };
    image?: { id: string; mime_type: string; sha256: string; caption?: string };
    audio?: { id: string; mime_type: string };
    video?: { id: string; mime_type: string; caption?: string };
    document?: { id: string; mime_type: string; filename: string; caption?: string };
    location?: { latitude: number; longitude: number; name?: string; address?: string };
    interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
    button?: { text: string; payload: string };
}

export interface WhatsAppStatus {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
    conversation?: { id: string; origin: { type: string } };
    pricing?: { billable: boolean; category: string };
    errors?: Array<{ code: number; title: string; message: string }>;
}

// Instagram Webhook Events
export interface InstagramWebhookEntry {
    id: string;
    time: number;
    messaging?: InstagramMessagingEvent[];
}

export interface InstagramMessagingEvent {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
            type: 'image' | 'video' | 'audio' | 'file' | 'share' | 'story_mention';
            payload: { url?: string };
        }>;
        is_echo?: boolean;
        quick_reply?: { payload: string };
    };
    postback?: {
        title: string;
        payload: string;
    };
    reaction?: {
        mid: string;
        action: 'react' | 'unreact';
        reaction?: string;
        emoji?: string;
    };
}

// =============================================================================
// OUTBOUND MESSAGE TYPES
// =============================================================================

export interface SendMessageRequest {
    channel: SocialChannel;
    recipientId: string;
    message: string;
    messageType?: 'text' | 'image' | 'template';
    mediaUrl?: string;
    templateName?: string;
    templateParams?: Record<string, string>;
    quickReplies?: Array<{
        title: string;
        payload: string;
    }>;
}

export interface SendMessageResponse {
    success: boolean;
    messageId?: string;
    timestamp?: number;
    error?: string;
    errorCode?: string;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface SocialChatAnalytics {
    projectId: string;
    period: 'day' | 'week' | 'month';
    startDate: string;
    endDate: string;
    metrics: {
        totalMessages: number;
        inboundMessages: number;
        outboundMessages: number;
        uniqueConversations: number;
        avgResponseTime: number; // in seconds
        aiHandledPercentage: number;
        escalatedPercentage: number;
        byChannel: Record<SocialChannel, {
            messages: number;
            conversations: number;
            avgResponseTime: number;
        }>;
    };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface SocialChatSettings {
    projectId: string;
    channels: SocialChannelsConfig;
    // AI settings
    aiEnabled: boolean;
    aiConfidenceThreshold: number; // 0-1, below this escalates to human
    maxAIRetries: number;
    // Response settings
    defaultLanguage: string;
    autoReplyOutsideHours: boolean;
    outsideHoursMessage?: string;
    // Business hours
    businessHours?: {
        timezone: string;
        schedule: Record<string, { open: string; close: string } | null>;
    };
    // Escalation
    escalationEmail?: string;
    escalationWebhook?: string;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
    SocialMessage as SocialChatMessage,
    SocialConversation as ChatConversation,
};








