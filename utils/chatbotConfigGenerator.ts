/**
 * Chatbot Configuration Generator
 * Generates aiAssistantConfig based on onboarding data and industry type
 */

import { 
    AiAssistantConfig, 
    FAQItem, 
    ChatAppearanceConfig,
    ChatColorScheme,
    ChatBrandingConfig,
    ChatBehaviorConfig,
    ChatMessagesConfig,
    ChatButtonConfig
} from '../types/ai-assistant';
import { 
    OnboardingProgress, 
    OnboardingContactInfo, 
    OnboardingService 
} from '../types/onboarding';
import { INDUSTRY_TEMPLATES, IndustryTemplate, QuickReply } from '../data/chatbotIndustryTemplates';

// =============================================================================
// TYPES
// =============================================================================

export interface GlobalColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    border: string;
}

// =============================================================================
// TONE DETERMINATION
// =============================================================================

const FORMAL_INDUSTRIES = ['legal', 'finance', 'healthcare', 'consulting', 'insurance', 'government'];
const FRIENDLY_INDUSTRIES = ['restaurant', 'cafe', 'fitness-gym', 'beauty-spa', 'entertainment', 'travel'];
const PROFESSIONAL_INDUSTRIES = ['technology', 'real-estate', 'construction', 'education'];

export const determineTone = (industry: string): string => {
    if (FORMAL_INDUSTRIES.includes(industry)) return 'Formal';
    if (FRIENDLY_INDUSTRIES.includes(industry)) return 'Friendly';
    if (PROFESSIONAL_INDUSTRIES.includes(industry)) return 'Professional';
    return 'Professional';
};

// =============================================================================
// BUSINESS PROFILE GENERATOR
// =============================================================================

export const generateBusinessProfile = (progress: OnboardingProgress): string => {
    const { businessName, industry, description, services, contactInfo, hasEcommerce, storeSetup } = progress;
    
    let profile = `${businessName} es un negocio dedicado a ${getIndustryDisplayName(industry)}.`;
    
    if (description) {
        profile += `\n\nDescripción del negocio:\n${description}`;
    }
    
    if (services && services.length > 0) {
        profile += `\n\nServicios/Productos principales:\n`;
        services.forEach((service, idx) => {
            profile += `- ${service.name}${service.description ? `: ${service.description}` : ''}\n`;
        });
    }
    
    if (hasEcommerce && storeSetup) {
        profile += `\n\nTienda en línea: ${storeSetup.storeName || businessName}`;
        if (storeSetup.selectedCategories?.length > 0) {
            profile += `\nCategorías de productos: ${storeSetup.selectedCategories.join(', ')}`;
        }
        profile += `\nMoneda: ${storeSetup.currency} (${storeSetup.currencySymbol})`;
    }
    
    if (contactInfo) {
        profile += `\n\nInformación de contacto:`;
        if (contactInfo.email) profile += `\n- Email: ${contactInfo.email}`;
        if (contactInfo.phone) profile += `\n- Teléfono: ${contactInfo.phone}`;
        if (contactInfo.address) {
            const addressParts = [contactInfo.address, contactInfo.city, contactInfo.state, contactInfo.country].filter(Boolean);
            profile += `\n- Dirección: ${addressParts.join(', ')}`;
        }
    }
    
    return profile;
};

// =============================================================================
// SPECIAL INSTRUCTIONS GENERATOR
// =============================================================================

export const generateSpecialInstructions = (
    industry: string, 
    hasEcommerce: boolean,
    language: string = 'es'
): string => {
    const template = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES['default'];
    const isSpanish = language === 'es';
    
    let instructions = isSpanish ? template.specialInstructions.es : template.specialInstructions.en;
    
    // Add ecommerce instructions if enabled
    if (hasEcommerce) {
        const ecommerceInstructions = isSpanish ? `

=== INSTRUCCIONES DE ECOMMERCE ===

CAPACIDADES DE TIENDA:
- Puedes ayudar a los clientes a encontrar productos
- Proporciona información sobre disponibilidad y precios
- Explica las opciones de envío y tiempos de entrega
- Responde preguntas sobre políticas de devolución

CONSULTAS DE ÓRDENES:
Cuando un cliente pregunte por su pedido:
1. Solicita el número de orden O el email con el que compraron
2. Una vez que tengas la información, busca el estado del pedido
3. Proporciona: estado actual, fecha estimada de entrega, número de tracking si existe
4. Si hay algún problema con el pedido, ofrece escalar a soporte humano

RESPUESTAS MODELO:
- "Para consultar tu pedido, necesito el número de orden o el email con el que realizaste la compra"
- "Tu orden #[número] está [estado]. La fecha estimada de entrega es [fecha]"
- "El número de seguimiento de tu envío es: [tracking]"
- "Veo que hubo un problema con tu pedido. Permíteme transferirte con un agente para resolverlo"

POLÍTICAS IMPORTANTES:
- NO proceses reembolsos directamente, solo informa el proceso
- NO modifiques pedidos, solo proporciona información
- Siempre sé transparente sobre tiempos de entrega
- Si no tienes información actualizada, indícalo claramente` : `

=== ECOMMERCE INSTRUCTIONS ===

STORE CAPABILITIES:
- Help customers find products
- Provide availability and pricing information
- Explain shipping options and delivery times
- Answer questions about return policies

ORDER INQUIRIES:
When a customer asks about their order:
1. Request the order number OR email used for purchase
2. Once you have the information, look up the order status
3. Provide: current status, estimated delivery date, tracking number if available
4. If there's an issue with the order, offer to escalate to human support

RESPONSE TEMPLATES:
- "To check your order, I need the order number or the email used for the purchase"
- "Your order #[number] is [status]. Estimated delivery is [date]"
- "Your shipment tracking number is: [tracking]"
- "I see there's an issue with your order. Let me transfer you to an agent to resolve it"

IMPORTANT POLICIES:
- DO NOT process refunds directly, only inform about the process
- DO NOT modify orders, only provide information
- Always be transparent about delivery times
- If you don't have updated information, clearly state so`;
        
        instructions += ecommerceInstructions;
    }
    
    return instructions;
};

// =============================================================================
// FAQ GENERATOR
// =============================================================================

export const generateIndustryFAQs = (
    industry: string, 
    hasEcommerce: boolean,
    language: string = 'es'
): FAQItem[] => {
    const template = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES['default'];
    const isSpanish = language === 'es';
    
    // Get industry-specific FAQs
    const industryFAQs = isSpanish ? template.defaultFAQs.es : template.defaultFAQs.en;
    
    // Add ecommerce FAQs if enabled
    const ecommerceFAQs: FAQItem[] = hasEcommerce ? (isSpanish ? [
        { id: 'ecom-1', question: '¿Cómo puedo rastrear mi pedido?', answer: 'Puedes rastrear tu pedido con el número de seguimiento que recibiste por email. Si no lo tienes, proporcióname tu número de orden o email y te ayudo a buscarlo.' },
        { id: 'ecom-2', question: '¿Cuál es la política de devoluciones?', answer: 'Aceptamos devoluciones dentro de los 30 días posteriores a la compra. El producto debe estar en su empaque original y sin usar. Contáctanos para iniciar el proceso.' },
        { id: 'ecom-3', question: '¿Cuánto tarda el envío?', answer: 'El tiempo de envío depende de tu ubicación. Envíos locales: 2-3 días hábiles. Envíos nacionales: 5-7 días hábiles. Te proporcionamos tracking para seguir tu pedido.' },
        { id: 'ecom-4', question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express), PayPal, y transferencias bancarias. Todos los pagos son seguros.' },
        { id: 'ecom-5', question: '¿Puedo cambiar o cancelar mi pedido?', answer: 'Puedes modificar o cancelar tu pedido dentro de las primeras 24 horas después de realizarlo. Después de ese tiempo, contáctanos y veremos las opciones disponibles.' },
    ] : [
        { id: 'ecom-1', question: 'How can I track my order?', answer: 'You can track your order with the tracking number you received via email. If you don\'t have it, provide me your order number or email and I\'ll help you find it.' },
        { id: 'ecom-2', question: 'What is your return policy?', answer: 'We accept returns within 30 days of purchase. The product must be in its original packaging and unused. Contact us to start the process.' },
        { id: 'ecom-3', question: 'How long does shipping take?', answer: 'Shipping time depends on your location. Local shipping: 2-3 business days. National shipping: 5-7 business days. We provide tracking to follow your order.' },
        { id: 'ecom-4', question: 'What payment methods do you accept?', answer: 'We accept credit/debit cards (Visa, Mastercard, American Express), PayPal, and bank transfers. All payments are secure.' },
        { id: 'ecom-5', question: 'Can I change or cancel my order?', answer: 'You can modify or cancel your order within the first 24 hours after placing it. After that time, contact us and we\'ll see what options are available.' },
    ]) : [];
    
    return [...industryFAQs, ...ecommerceFAQs];
};

// =============================================================================
// QUICK REPLIES GENERATOR
// =============================================================================

export const generateQuickReplies = (
    industry: string, 
    hasEcommerce: boolean,
    language: string = 'es'
): QuickReply[] => {
    const template = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES['default'];
    const isSpanish = language === 'es';
    
    // Get industry-specific quick replies
    const industryReplies = isSpanish ? template.quickReplies.es : template.quickReplies.en;
    
    // Add ecommerce quick replies if enabled
    const ecommerceReplies: QuickReply[] = hasEcommerce ? (isSpanish ? [
        { id: 'qr-ecom-1', text: '¿Dónde está mi pedido?', emoji: '📦' },
        { id: 'qr-ecom-2', text: 'Información de envío', emoji: '🚚' },
    ] : [
        { id: 'qr-ecom-1', text: 'Where is my order?', emoji: '📦' },
        { id: 'qr-ecom-2', text: 'Shipping info', emoji: '🚚' },
    ]) : [];
    
    // Combine and limit to 4 quick replies
    return [...industryReplies, ...ecommerceReplies].slice(0, 4);
};

// =============================================================================
// CHAT APPEARANCE GENERATOR
// =============================================================================

export const generateChatAppearance = (
    globalColors: GlobalColors,
    industry: string,
    language: string = 'es'
): ChatAppearanceConfig => {
    const isSpanish = language === 'es';
    const template = INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES['default'];
    
    // Determine if primary color is dark
    const isDarkPrimary = isColorDark(globalColors.primary);
    
    const branding: ChatBrandingConfig = {
        logoType: 'emoji',
        logoEmoji: template.emoji || '💬',
        logoSize: 'md',
        botAvatarEmoji: template.emoji || '🤖',
        showBotAvatar: true,
        showUserAvatar: false,
        userAvatarStyle: 'initials',
    };
    
    const colors: ChatColorScheme = {
        primaryColor: globalColors.primary,
        secondaryColor: globalColors.secondary,
        accentColor: globalColors.accent,
        userBubbleColor: globalColors.primary,
        userTextColor: isDarkPrimary ? '#ffffff' : '#1f2937',
        botBubbleColor: globalColors.surface || '#f3f4f6',
        botTextColor: globalColors.text || '#1f2937',
        backgroundColor: '#ffffff',
        inputBackground: '#ffffff',
        inputBorder: globalColors.border || '#e5e7eb',
        inputText: globalColors.text || '#1f2937',
        headerBackground: globalColors.primary,
        headerText: isDarkPrimary ? '#ffffff' : '#1f2937',
    };
    
    const behavior: ChatBehaviorConfig = {
        position: 'bottom-right',
        offsetX: 20,
        offsetY: 20,
        width: 'md',
        height: 'md',
        autoOpen: false,
        autoOpenDelay: 5,
        openOnScroll: 0,
        openOnTime: 0,
        fullScreenOnMobile: true,
    };
    
    const quickReplies = generateQuickReplies(industry, false, language);
    
    const messages: ChatMessagesConfig = {
        welcomeMessage: isSpanish 
            ? `¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?`
            : `Hi! 👋 I'm your virtual assistant. How can I help you today?`,
        welcomeMessageEnabled: true,
        welcomeDelay: 1,
        inputPlaceholder: isSpanish ? 'Escribe tu mensaje...' : 'Type your message...',
        quickReplies,
        showTypingIndicator: true,
    };
    
    const button: ChatButtonConfig = {
        buttonStyle: 'circle',
        buttonSize: 'lg',
        buttonIcon: 'chat',
        pulseEffect: true,
        shadowSize: 'lg',
        showTooltip: true,
        tooltipText: isSpanish ? '¿Necesitas ayuda?' : 'Need help?',
        showButtonText: false,
    };
    
    return {
        branding,
        colors,
        behavior,
        messages,
        button,
        theme: 'auto',
    };
};

// =============================================================================
// SERVICES FORMATTER
// =============================================================================

export const formatServices = (services?: OnboardingService[]): string => {
    if (!services || services.length === 0) return '';
    
    return services.map(service => {
        let text = service.name;
        if (service.description) text += `: ${service.description}`;
        if (service.price) text += ` - ${service.price}`;
        return text;
    }).join('\n');
};

// =============================================================================
// CONTACT INFO FORMATTER
// =============================================================================

export const formatContactInfo = (contactInfo?: OnboardingContactInfo): string => {
    if (!contactInfo) return '';
    
    const parts: string[] = [];
    
    if (contactInfo.email) parts.push(`Email: ${contactInfo.email}`);
    if (contactInfo.phone) parts.push(`Teléfono: ${contactInfo.phone}`);
    
    if (contactInfo.address) {
        const addressParts = [
            contactInfo.address,
            contactInfo.city,
            contactInfo.state,
            contactInfo.zipCode,
            contactInfo.country
        ].filter(Boolean);
        parts.push(`Dirección: ${addressParts.join(', ')}`);
    }
    
    // Social media
    const socialMedia: string[] = [];
    if (contactInfo.facebook) socialMedia.push(`Facebook: ${contactInfo.facebook}`);
    if (contactInfo.instagram) socialMedia.push(`Instagram: ${contactInfo.instagram}`);
    if (contactInfo.twitter) socialMedia.push(`Twitter: ${contactInfo.twitter}`);
    if (contactInfo.linkedin) socialMedia.push(`LinkedIn: ${contactInfo.linkedin}`);
    if (contactInfo.youtube) socialMedia.push(`YouTube: ${contactInfo.youtube}`);
    if (contactInfo.tiktok) socialMedia.push(`TikTok: ${contactInfo.tiktok}`);
    
    if (socialMedia.length > 0) {
        parts.push(`Redes sociales:\n${socialMedia.join('\n')}`);
    }
    
    // Business hours
    if (contactInfo.businessHours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames: Record<string, string> = {
            monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
            thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
        };
        
        const hours: string[] = [];
        days.forEach(day => {
            const dayHours = contactInfo.businessHours?.[day as keyof typeof contactInfo.businessHours];
            if (dayHours?.isOpen && dayHours.openTime && dayHours.closeTime) {
                hours.push(`${dayNames[day]}: ${dayHours.openTime} - ${dayHours.closeTime}`);
            } else if (dayHours && !dayHours.isOpen) {
                hours.push(`${dayNames[day]}: Cerrado`);
            }
        });
        
        if (hours.length > 0) {
            parts.push(`Horario de atención:\n${hours.join('\n')}`);
        }
    }
    
    return parts.join('\n\n');
};

// =============================================================================
// FULL CONFIG GENERATOR
// =============================================================================

export const generateAiAssistantConfig = (
    progress: OnboardingProgress,
    globalColors: GlobalColors
): AiAssistantConfig => {
    const { businessName, industry, hasEcommerce, language } = progress;
    
    return {
        agentName: `Asistente de ${businessName}`,
        tone: determineTone(industry),
        languages: language === 'es' ? 'Spanish, English' : 'English, Spanish',
        businessProfile: generateBusinessProfile(progress),
        productsServices: formatServices(progress.services),
        policiesContact: formatContactInfo(progress.contactInfo),
        specialInstructions: generateSpecialInstructions(industry, hasEcommerce || false, language),
        faqs: generateIndustryFAQs(industry, hasEcommerce || false, language),
        knowledgeDocuments: [],
        widgetColor: globalColors.primary,
        isActive: true,
        leadCaptureEnabled: true,
        leadCaptureConfig: {
            enabled: true,
            preChatForm: false,
            triggerAfterMessages: 3,
            requireEmailForAdvancedInfo: true,
            exitIntentEnabled: true,
            exitIntentOffer: language === 'es' 
                ? '¿Te vas? ¡Déjanos tu email y te enviamos información útil!'
                : 'Leaving? Leave us your email and we\'ll send you useful info!',
            intentKeywords: [],
            progressiveProfilingEnabled: true,
        },
        appearance: generateChatAppearance(globalColors, industry, language),
        enableLiveVoice: false,
        voiceName: 'Zephyr',
    };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getIndustryDisplayName = (industry: string): string => {
    const names: Record<string, string> = {
        'restaurant': 'gastronomía y restauración',
        'cafe': 'cafetería y bebidas',
        'technology': 'tecnología y software',
        'healthcare': 'salud y bienestar',
        'legal': 'servicios legales',
        'finance': 'servicios financieros',
        'consulting': 'consultoría empresarial',
        'fitness-gym': 'fitness y gimnasio',
        'beauty-spa': 'belleza y spa',
        'real-estate': 'bienes raíces',
        'construction': 'construcción',
        'education': 'educación',
        'travel': 'viajes y turismo',
        'event-planning': 'organización de eventos',
        'photography': 'fotografía',
        'automotive': 'automotriz',
        'ecommerce': 'comercio electrónico',
        'retail': 'retail y ventas',
        'fashion': 'moda y accesorios',
        'default': 'servicios profesionales',
    };
    return names[industry] || names['default'];
};

const isColorDark = (hexColor: string): boolean => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance < 0.5;
};


