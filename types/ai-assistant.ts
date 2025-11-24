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

export interface LeadCaptureConfig {
    enabled: boolean;
    preChatForm: boolean;
    triggerAfterMessages: number;
    requireEmailForAdvancedInfo: boolean;
    exitIntentEnabled: boolean;
    exitIntentOffer?: string;
    intentKeywords: string[];
    progressiveProfilingEnabled: boolean;
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
    widgetColor: string;
    isActive: boolean;
    leadCaptureEnabled: boolean;
    leadCaptureConfig?: LeadCaptureConfig;
    appearance?: ChatAppearanceConfig;
    enableLiveVoice: boolean;
    voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
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

