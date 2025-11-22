import { ChatAppearanceConfig } from '../types';

// Default configuration
export const getDefaultAppearanceConfig = (): ChatAppearanceConfig => ({
    branding: {
        logoType: 'emoji',
        logoEmoji: '💬',
        logoSize: 'md',
        botAvatarEmoji: '🤖',
        showBotAvatar: true,
        showUserAvatar: true,
        userAvatarStyle: 'initials'
    },
    colors: {
        primaryColor: '#4F46E5',
        secondaryColor: '#6366F1',
        accentColor: '#8B5CF6',
        userBubbleColor: '#4F46E5',
        userTextColor: '#FFFFFF',
        botBubbleColor: '#F3F4F6',
        botTextColor: '#111827',
        backgroundColor: '#FFFFFF',
        inputBackground: '#F9FAFB',
        inputBorder: '#E5E7EB',
        inputText: '#111827',
        headerBackground: '#4F46E5',
        headerText: '#FFFFFF'
    },
    behavior: {
        position: 'bottom-right',
        offsetX: 24,
        offsetY: 24,
        width: 'md',
        height: 'lg',
        autoOpen: false,
        autoOpenDelay: 5,
        openOnScroll: 0,
        openOnTime: 0,
        fullScreenOnMobile: true
    },
    messages: {
        welcomeMessage: '👋 Hello! How can I help you today?',
        welcomeMessageEnabled: true,
        welcomeDelay: 1,
        inputPlaceholder: 'Type your message...',
        quickReplies: [],
        showTypingIndicator: true
    },
    button: {
        buttonStyle: 'circle',
        buttonSize: 'lg',
        buttonIcon: 'chat',
        customEmoji: '💬',
        showButtonText: false,
        buttonText: 'Chat with us',
        pulseEffect: true,
        shadowSize: 'xl',
        showTooltip: true,
        tooltipText: 'Chat with us!'
    },
    theme: 'light'
});

// Theme Presets
export const THEME_PRESETS: Record<string, Partial<ChatAppearanceConfig>> = {
    professional: {
        colors: {
            primaryColor: '#1E40AF',
            secondaryColor: '#3B82F6',
            accentColor: '#60A5FA',
            userBubbleColor: '#1E40AF',
            userTextColor: '#FFFFFF',
            botBubbleColor: '#F1F5F9',
            botTextColor: '#1E293B',
            backgroundColor: '#FFFFFF',
            inputBackground: '#F8FAFC',
            inputBorder: '#CBD5E1',
            inputText: '#0F172A',
            headerBackground: '#1E40AF',
            headerText: '#FFFFFF'
        },
        branding: {
            logoType: 'emoji',
            logoEmoji: '💼',
            logoSize: 'md',
            botAvatarEmoji: '👔',
            showBotAvatar: true,
            showUserAvatar: true,
            userAvatarStyle: 'initials'
        },
        button: {
            buttonStyle: 'circle',
            buttonSize: 'lg',
            buttonIcon: 'custom-emoji',
            customEmoji: '💼',
            showButtonText: false,
            pulseEffect: false,
            shadowSize: 'lg',
            showTooltip: true,
            tooltipText: 'Professional Support'
        }
    },
    
    friendly: {
        colors: {
            primaryColor: '#F59E0B',
            secondaryColor: '#FBBF24',
            accentColor: '#FCD34D',
            userBubbleColor: '#F59E0B',
            userTextColor: '#FFFFFF',
            botBubbleColor: '#FEF3C7',
            botTextColor: '#78350F',
            backgroundColor: '#FFFBEB',
            inputBackground: '#FFFFFF',
            inputBorder: '#FDE68A',
            inputText: '#78350F',
            headerBackground: '#F59E0B',
            headerText: '#FFFFFF'
        },
        branding: {
            logoType: 'emoji',
            logoEmoji: '😊',
            logoSize: 'md',
            botAvatarEmoji: '🌟',
            showBotAvatar: true,
            showUserAvatar: true,
            userAvatarStyle: 'initials'
        },
        button: {
            buttonStyle: 'circle',
            buttonSize: 'lg',
            buttonIcon: 'custom-emoji',
            customEmoji: '😊',
            showButtonText: false,
            pulseEffect: true,
            shadowSize: 'xl',
            showTooltip: true,
            tooltipText: '¡Hola! Chat with us 👋'
        },
        messages: {
            welcomeMessage: '😊 ¡Hola! I\'m here to help you. What can I do for you today?',
            welcomeMessageEnabled: true,
            welcomeDelay: 1,
            inputPlaceholder: 'Message us...',
            quickReplies: [],
            showTypingIndicator: true
        }
    },
    
    modern: {
        colors: {
            primaryColor: '#0EA5E9',
            secondaryColor: '#06B6D4',
            accentColor: '#22D3EE',
            userBubbleColor: '#0EA5E9',
            userTextColor: '#FFFFFF',
            botBubbleColor: '#F0F9FF',
            botTextColor: '#0C4A6E',
            backgroundColor: '#FFFFFF',
            inputBackground: '#FAFAFA',
            inputBorder: '#E0E0E0',
            inputText: '#0C4A6E',
            headerBackground: '#0EA5E9',
            headerText: '#FFFFFF'
        },
        branding: {
            logoType: 'emoji',
            logoEmoji: '⚡',
            logoSize: 'md',
            botAvatarEmoji: '🚀',
            showBotAvatar: true,
            showUserAvatar: true,
            userAvatarStyle: 'icon'
        },
        button: {
            buttonStyle: 'rounded',
            buttonSize: 'lg',
            buttonIcon: 'custom-emoji',
            customEmoji: '⚡',
            showButtonText: false,
            pulseEffect: false,
            shadowSize: 'md',
            showTooltip: true,
            tooltipText: 'Quick Support'
        }
    },
    
    dark: {
        colors: {
            primaryColor: '#8B5CF6',
            secondaryColor: '#A78BFA',
            accentColor: '#C4B5FD',
            userBubbleColor: '#8B5CF6',
            userTextColor: '#FFFFFF',
            botBubbleColor: '#374151',
            botTextColor: '#F3F4F6',
            backgroundColor: '#1F2937',
            inputBackground: '#374151',
            inputBorder: '#4B5563',
            inputText: '#F9FAFB',
            headerBackground: '#111827',
            headerText: '#FFFFFF'
        },
        branding: {
            logoType: 'emoji',
            logoEmoji: '🌙',
            logoSize: 'md',
            botAvatarEmoji: '🦉',
            showBotAvatar: true,
            showUserAvatar: true,
            userAvatarStyle: 'initials'
        },
        button: {
            buttonStyle: 'circle',
            buttonSize: 'lg',
            buttonIcon: 'custom-emoji',
            customEmoji: '🌙',
            showButtonText: false,
            pulseEffect: true,
            shadowSize: 'xl',
            showTooltip: true,
            tooltipText: 'Night Support'
        },
        theme: 'dark'
    },
    
    colorful: {
        colors: {
            primaryColor: '#EC4899',
            secondaryColor: '#F472B6',
            accentColor: '#FB7185',
            userBubbleColor: '#EC4899',
            userTextColor: '#FFFFFF',
            botBubbleColor: '#FCE7F3',
            botTextColor: '#831843',
            backgroundColor: '#FFF1F2',
            inputBackground: '#FFFFFF',
            inputBorder: '#FBB6CE',
            inputText: '#831843',
            headerBackground: '#EC4899',
            headerText: '#FFFFFF'
        },
        branding: {
            logoType: 'emoji',
            logoEmoji: '🎨',
            logoSize: 'md',
            botAvatarEmoji: '🌈',
            showBotAvatar: true,
            showUserAvatar: true,
            userAvatarStyle: 'initials'
        },
        button: {
            buttonStyle: 'circle',
            buttonSize: 'lg',
            buttonIcon: 'custom-emoji',
            customEmoji: '🎨',
            showButtonText: false,
            pulseEffect: true,
            shadowSize: 'xl',
            showTooltip: true,
            tooltipText: 'Creative Support'
        }
    },
    
    minimal: {
        colors: {
            primaryColor: '#000000',
            secondaryColor: '#374151',
            accentColor: '#6B7280',
            userBubbleColor: '#000000',
            userTextColor: '#FFFFFF',
            botBubbleColor: '#F9FAFB',
            botTextColor: '#111827',
            backgroundColor: '#FFFFFF',
            inputBackground: '#FFFFFF',
            inputBorder: '#E5E7EB',
            inputText: '#111827',
            headerBackground: '#FFFFFF',
            headerText: '#000000'
        },
        branding: {
            logoType: 'emoji',
            logoEmoji: '○',
            logoSize: 'sm',
            botAvatarEmoji: '•',
            showBotAvatar: false,
            showUserAvatar: false,
            userAvatarStyle: 'none'
        },
        button: {
            buttonStyle: 'circle',
            buttonSize: 'md',
            buttonIcon: 'chat',
            showButtonText: false,
            pulseEffect: false,
            shadowSize: 'sm',
            showTooltip: false,
            tooltipText: ''
        }
    }
};

// Utility functions
export const applyThemePreset = (
    currentConfig: ChatAppearanceConfig,
    presetName: keyof typeof THEME_PRESETS
): ChatAppearanceConfig => {
    const preset = THEME_PRESETS[presetName];
    return {
        ...currentConfig,
        colors: { ...currentConfig.colors, ...preset.colors },
        branding: { ...currentConfig.branding, ...preset.branding },
        button: { ...currentConfig.button, ...preset.button },
        messages: preset.messages ? { ...currentConfig.messages, ...preset.messages } : currentConfig.messages,
        theme: preset.theme || currentConfig.theme
    };
};

export const getSizeClasses = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    const sizeMap = {
        sm: { width: 'w-[320px]', height: 'max-h-[500px]' },
        md: { width: 'w-[380px]', height: 'max-h-[600px]' },
        lg: { width: 'w-[450px]', height: 'max-h-[700px]' },
        xl: { width: 'w-[500px]', height: 'max-h-[800px]' }
    };
    return sizeMap[size];
};

export const getPositionClasses = (position: string, offsetX: number, offsetY: number) => {
    const positionMap: Record<string, string> = {
        'bottom-right': `bottom-[${offsetY}px] right-[${offsetX}px]`,
        'bottom-left': `bottom-[${offsetY}px] left-[${offsetX}px]`,
        'top-right': `top-[${offsetY}px] right-[${offsetX}px]`,
        'top-left': `top-[${offsetY}px] left-[${offsetX}px]`
    };
    return positionMap[position] || positionMap['bottom-right'];
};

export const getButtonSizeClasses = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    const sizeMap = {
        sm: 'w-12 h-12 text-xl',
        md: 'w-14 h-14 text-2xl',
        lg: 'w-16 h-16 text-3xl',
        xl: 'w-20 h-20 text-4xl'
    };
    return sizeMap[size];
};

export const getShadowClasses = (size: 'none' | 'sm' | 'md' | 'lg' | 'xl') => {
    const shadowMap = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-2xl'
    };
    return shadowMap[size];
};

export const getButtonStyleClasses = (style: 'circle' | 'rounded' | 'square') => {
    const styleMap = {
        circle: 'rounded-full',
        rounded: 'rounded-2xl',
        square: 'rounded-lg'
    };
    return styleMap[style];
};

