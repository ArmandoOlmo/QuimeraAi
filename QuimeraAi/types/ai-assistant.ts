/**
 * AI Assistant Types
 * Tipos para configuración del asistente de AI y chatbot
 */

// =============================================================================
// AI ASSISTANT CONFIGURATION
// =============================================================================
export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export interface KnowledgeDocument {
    id: string;
    name: string;
    content: string;
    extractedAt: { seconds: number; nanoseconds: number };
    fileType: string;
    size: number;
}

export interface KnowledgeLink {
    id: string;
    url: string;
    title: string;
    content: string;
    type: 'website' | 'youtube';
    status: 'pending' | 'extracting' | 'ready' | 'error';
    extractedAt?: { seconds: number; nanoseconds: number };
    error?: string;
    /** Content length in characters */
    contentLength?: number;
    /** YouTube video duration if applicable */
    videoDuration?: string;
    /** Thumbnail URL for YouTube videos */
    thumbnailUrl?: string;
}

export interface LeadCaptureConfig {
    enabled: boolean;
    preChatForm: boolean;
    triggerAfterMessages: number;
    requireEmailForAdvancedInfo: boolean;
    exitIntentEnabled: boolean;
    exitIntentOffer?: string;
    /** Custom intent keywords for lead detection. If empty, defaults are used. */
    intentKeywords: string[];
    progressiveProfilingEnabled: boolean;
    /** Business hours start (0-23). Default: 9 */
    businessHoursStart?: number;
    /** Business hours end (0-23). Default: 18 */
    businessHoursEnd?: number;
    /** Business days (0=Sun, 1=Mon, ... 6=Sat). Default: [1,2,3,4,5,6] (Mon-Sat) */
    businessDays?: number[];
}

// =============================================================================
// CHAT CUSTOMIZATION
// =============================================================================
export interface ChatBrandingConfig {
    logoType: 'none' | 'image' | 'emoji';
    logoUrl?: string;
    logoEmoji?: string;
    logoSize: 'sm' | 'md' | 'lg';
    botAvatarUrl?: string;
    botAvatarEmoji?: string;
    showBotAvatar: boolean;
    showUserAvatar: boolean;
    userAvatarStyle: 'initials' | 'icon' | 'none';
}

export interface ChatColorScheme {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    userBubbleColor: string;
    userTextColor: string;
    botBubbleColor: string;
    botTextColor: string;
    backgroundColor: string;
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    headerBackground: string;
    headerText: string;
}

export interface ChatBehaviorConfig {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    offsetX: number;
    offsetY: number;
    width: 'sm' | 'md' | 'lg' | 'xl';
    height: 'sm' | 'md' | 'lg' | 'full';
    autoOpen: boolean;
    autoOpenDelay: number;
    openOnScroll: number;
    openOnTime: number;
    fullScreenOnMobile: boolean;
}

export interface ChatMessagesConfig {
    welcomeMessage: string;
    welcomeMessageEnabled: boolean;
    welcomeDelay: number;
    inputPlaceholder: string;
    quickReplies: Array<{
        id: string;
        text: string;
        emoji?: string;
    }>;
    showTypingIndicator: boolean;
}

export interface ChatButtonConfig {
    buttonStyle: 'circle' | 'rounded' | 'square';
    buttonSize: 'sm' | 'md' | 'lg' | 'xl';
    buttonIcon: 'chat' | 'help' | 'custom-emoji' | 'custom-image';
    customEmoji?: string;
    customIconUrl?: string;
    showButtonText: boolean;
    buttonText?: string;
    pulseEffect: boolean;
    shadowSize: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    showTooltip: boolean;
    tooltipText: string;
}

export interface ChatAppearanceConfig {
    branding: ChatBrandingConfig;
    colors: ChatColorScheme;
    behavior: ChatBehaviorConfig;
    messages: ChatMessagesConfig;
    button: ChatButtonConfig;
    theme: 'light' | 'dark' | 'auto';
}

// Social Channel Configuration (for multi-channel chat)
export interface SocialChannelConfig {
    enabled: boolean;
    autoConfigured?: boolean; // True if configured via Meta OAuth
    // Platform-specific config (stored securely)
}

export interface FacebookMessengerChannelConfig extends SocialChannelConfig {
    pageId: string;
    pageAccessToken: string;
    webhookVerifyToken: string;
    pageName?: string;
}

export interface WhatsAppChannelConfig extends SocialChannelConfig {
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    webhookVerifyToken: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
}

export interface InstagramChannelConfig extends SocialChannelConfig {
    accountId: string;
    accessToken: string;
    webhookVerifyToken: string;
    username?: string;
}

export interface SocialChannelsConfig {
    facebook?: FacebookMessengerChannelConfig;
    whatsapp?: WhatsAppChannelConfig;
    instagram?: InstagramChannelConfig;
}

export interface AiAssistantConfig {
    agentName: string;
    tone: string;
    languages: string;
    businessProfile: string;
    productsServices: string;
    policiesContact: string;
    specialInstructions: string;
    faqs: FAQItem[];
    knowledgeDocuments: KnowledgeDocument[];
    knowledgeLinks: KnowledgeLink[];
    widgetColor: string;
    isActive: boolean;
    leadCaptureEnabled: boolean;
    leadCaptureConfig?: LeadCaptureConfig;
    appearance?: ChatAppearanceConfig;
    enableLiveVoice: boolean;
    voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
    // ElevenLabs Voice Configuration
    /** Voice provider: 'gemini' uses prebuilt Gemini voices, 'elevenlabs' uses ElevenLabs TTS */
    voiceProvider?: 'gemini' | 'elevenlabs';
    /** ElevenLabs voice ID (for TTS and cloned voices) */
    elevenlabsVoiceId?: string;
    /** ElevenLabs voice display name */
    elevenlabsVoiceName?: string;
    /** Whether to auto-play ElevenLabs TTS for bot text responses */
    enableElevenLabsTTS?: boolean;
    // CMS articles included as chatbot knowledge sources
    cmsArticleIds?: string[];
    // Social media channel integrations
    socialChannels?: SocialChannelsConfig;
}

/**
 * Cloned voice metadata stored in Firestore at projects/{projectId}/voices/{voiceId}
 */
export interface ClonedVoice {
    /** ElevenLabs voice_id */
    id: string;
    name: string;
    description?: string;
    projectId: string;
    tenantId?: string;
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    sampleCount: number;
    labels?: Record<string, string>;
    provider: 'elevenlabs';
}

// =============================================================================
// GLOBAL AI ASSISTANT
// =============================================================================
export interface ScopePermission {
    chat: boolean;
    voice: boolean;
}

export interface GlobalAssistantConfig {
    isEnabled: boolean;
    model: string;
    systemInstruction: string;
    enabledTemplates?: string[];
    customInstructions?: string;
    enableLiveVoice: boolean;
    voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
    greeting: string;
    permissions: Record<string, ScopePermission>;
    temperature: number;
    maxTokens: number;
    autoDetectLanguage?: boolean;
    supportedLanguages?: string;
}

// =============================================================================
// GLOBAL CHATBOT PROMPTS (SuperAdmin configuration for all project chatbots)
// =============================================================================
export interface GlobalChatbotPrompts {
    /** Template for how the bot introduces itself, e.g., "You are {{agentName}}, a {{tone}} AI assistant..." */
    identityTemplate: string;
    /** Core instructions for behavior, language matching, etc. */
    coreInstructions: string;
    /** Formatting guidelines (markdown, lists, etc.) */
    formattingGuidelines: string;
    /** Instructions for appointment scheduling */
    appointmentInstructions: string;
    /** Instructions for e-commerce support (order lookup, products, etc.) */
    ecommerceInstructions: string;
    /** Instructions for lead capture behavior */
    leadCaptureInstructions: string;
    /** Last update timestamp */
    updatedAt?: string;
    /** User ID who made the last update */
    updatedBy?: string;
}

























