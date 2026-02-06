/**
 * Landing Chatbot Types
 * Tipos para el chatbot de la landing page pública de Quimera.ai
 */

import { FAQItem, KnowledgeDocument, ChatColorScheme, ChatAppearanceConfig } from './ai-assistant';
import { WhatsAppChannelConfig, FacebookMessengerChannelConfig, InstagramChannelConfig } from './ai-assistant';

// =============================================================================
// PRODUCT & PRICING
// =============================================================================

export interface ProductFeature {
    id: string;
    name: string;
    description: string;
    icon?: string;
    includedInPlans: string[]; // Plan IDs where this feature is included
}

export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    description: string;
    features: string[];
    isPopular?: boolean;
    ctaText?: string;
    ctaUrl?: string;
}

// =============================================================================
// KNOWLEDGE BASE
// =============================================================================

export interface LandingKnowledgeBase {
    companyInfo: string;              // Descripción general de Quimera.ai
    productFeatures: ProductFeature[];
    pricingPlans: PricingPlan[];
    faqs: FAQItem[];
    documents: KnowledgeDocument[];
    additionalContext?: string;       // Contexto adicional para el bot
}

// =============================================================================
// PERSONALITY
// =============================================================================

export type PersonalityTone = 'professional' | 'friendly' | 'enthusiastic' | 'technical';
export type SalesMode = 'soft' | 'proactive';
export type ResponseStyle = 'concise' | 'detailed';

export interface LandingChatbotPersonality {
    tone: PersonalityTone;
    languages: string[];              // ['es', 'en']
    systemPrompt: string;             // Instrucciones base del sistema
    responseStyle: ResponseStyle;
    salesMode: SalesMode;             // Qué tan orientado a ventas
    customInstructions?: string;      // Instrucciones adicionales
}

// =============================================================================
// VOICE CONFIGURATION
// =============================================================================

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface LandingChatbotVoice {
    enabled: boolean;
    voiceName: VoiceName;
    autoPlayGreeting: boolean;
}

// =============================================================================
// LEAD CAPTURE
// =============================================================================

export interface LandingLeadCapture {
    enabled: boolean;
    triggerAfterMessages: number;
    preChatForm: boolean;
    exitIntentEnabled: boolean;
    exitIntentOffer: string;
    requireEmailForPricing: boolean;  // Gate de pricing
    requireEmailForDemo: boolean;     // Gate para demos
    progressiveProfilingEnabled: boolean;
    highIntentKeywords: string[];     // "precio", "demo", "comprar", etc.
}

// =============================================================================
// APPEARANCE
// =============================================================================

export type ColorSource = 'app' | 'custom';
export type ButtonIconType = 'chat' | 'help' | 'bot' | 'sparkles' | 'custom-emoji' | 'custom-image';

export interface LandingChatbotColors {
    // Header
    headerBackground: string;
    headerText: string;
    // Messages
    botBubbleBackground: string;
    botBubbleText: string;
    userBubbleBackground: string;
    userBubbleText: string;
    // General
    background: string;
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    // Button
    buttonBackground: string;
    buttonIcon: string;
    // Accents
    primary: string;
    mutedText: string;
}

// Quimera.ai brand colors: Yellow/Gold primary, Dark blue backgrounds
export const defaultChatbotColors: LandingChatbotColors = {
    headerBackground: '#0f172a',      // Dark blue (slate-900)
    headerText: '#facc15',            // Yellow/Gold
    botBubbleBackground: '#1e293b',   // Slate-800
    botBubbleText: '#f1f5f9',         // Slate-100
    userBubbleBackground: '#facc15',  // Yellow/Gold primary
    userBubbleText: '#0f172a',        // Dark text on yellow
    background: '#0f172a',            // Dark blue background
    inputBackground: '#1e293b',       // Slate-800
    inputBorder: '#334155',           // Slate-700
    inputText: '#f1f5f9',             // Slate-100
    buttonBackground: '#facc15',      // Yellow/Gold
    buttonIcon: '#0f172a',            // Dark icon on yellow button
    primary: '#facc15',               // Yellow/Gold
    mutedText: '#94a3b8',             // Slate-400
};

export interface LandingChatbotAppearance {
    colorSource: ColorSource;         // 'app' = usar design tokens, 'custom' = colores personalizados
    customColors: LandingChatbotColors;
    position: 'bottom-right' | 'bottom-left';
    offsetX: number;
    offsetY: number;
    size: 'sm' | 'md' | 'lg';
    buttonStyle: 'circle' | 'rounded' | 'square';
    buttonIcon: ButtonIconType;
    customEmoji?: string;
    customIconUrl?: string;           // URL de imagen personalizada para el botón
    avatarUrl?: string;               // URL del logo/avatar del bot (header y mensajes)
    pulseEffect: boolean;
    showOnAllPages: boolean;
    excludedPaths: string[];          // Rutas donde NO mostrar el chatbot
}

// Legacy alias for backward compatibility
export type LandingChatbotAppearanceLegacy = Omit<LandingChatbotAppearance, 'colorSource' | 'customColors'> & {
    useAppColors?: boolean;
    customColors?: Partial<ChatColorScheme>;
};

// =============================================================================
// PROACTIVE MESSAGES
// =============================================================================

export type ProactiveMessageTrigger = 'time' | 'scroll' | 'exit-intent' | 'page';

export interface ProactiveMessage {
    id: string;
    enabled: boolean;
    trigger: ProactiveMessageTrigger;
    triggerValue: number | string;    // seconds, scroll %, or path
    message: string;
}

// =============================================================================
// SOCIAL CHANNELS
// =============================================================================

export interface LandingSocialChannels {
    whatsapp?: WhatsAppChannelConfig;
    facebook?: FacebookMessengerChannelConfig;
    instagram?: InstagramChannelConfig;
}

// =============================================================================
// BEHAVIOR / MODEL SETTINGS
// =============================================================================

export interface LandingChatbotBehavior {
    maxTokens: number;
    temperature: number;
    autoOpen: boolean;
    autoOpenDelay: number;            // seconds
    proactiveMessages: ProactiveMessage[];
}

// =============================================================================
// MAIN CONFIG
// =============================================================================

export interface LandingChatbotConfig {
    // Estado
    isActive: boolean;

    // Identidad
    agentName: string;
    agentRole: string;
    welcomeMessage: string;
    inputPlaceholder: string;

    // Secciones de configuración
    knowledgeBase: LandingKnowledgeBase;
    personality: LandingChatbotPersonality;
    voice: LandingChatbotVoice;
    leadCapture: LandingLeadCapture;
    appearance: LandingChatbotAppearance;
    socialChannels: LandingSocialChannels;
    behavior: LandingChatbotBehavior;

    // Metadata
    lastUpdated?: { seconds: number; nanoseconds: number };
    updatedBy?: string;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const defaultLandingChatbotConfig: LandingChatbotConfig = {
    isActive: true,  // Active by default for public landing page
    agentName: 'Quibo',
    agentRole: 'AI Assistant',
    welcomeMessage: '¡Hola! 👋 Soy **Quibo**, el asistente de IA de Quimera.ai. Puedo ayudarte a conocer nuestra plataforma de creación de sitios web. ¿Qué te gustaría saber?',
    inputPlaceholder: 'Pregúntame sobre Quimera.ai...',

    knowledgeBase: {
        companyInfo: `**Quimera.ai** es una plataforma revolucionaria de creación de sitios web impulsada por inteligencia artificial. Permitimos que emprendedores, negocios y agencias digitales creen websites profesionales sin necesidad de programar.

**Nuestra misión:** Democratizar la creación web, haciendo que cualquier persona pueda tener presencia digital profesional en minutos, no días.

**Tecnología:** Utilizamos Google Gemini AI para generación de contenido, diseño inteligente y asistencia en tiempo real. Nuestra plataforma está construida con React, TypeScript, Firebase y Tailwind CSS.

**Fundada:** 2024
**Sede:** Ciudad de México, México
**Email:** contacto@quimeraai.com
**Sitio web:** https://quimera.ai`,

        productFeatures: [
            // AI & Builder
            { id: 'ai-web-builder', name: 'AI Web Builder', description: 'Genera sitios web completos con inteligencia artificial. Describe tu negocio y la IA crea tu sitio en minutos con contenido, imágenes y diseño profesional.', icon: 'Sparkles', includedInPlans: ['free', 'starter', 'pro', 'agency', 'enterprise'] },
            { id: 'visual-editor', name: 'Editor Visual Drag & Drop', description: 'Edita tu sitio visualmente sin código. Personaliza colores, tipografía, espaciados e imágenes con un editor intuitivo en tiempo real.', icon: 'Palette', includedInPlans: ['free', 'starter', 'pro', 'agency', 'enterprise'] },
            { id: 'ai-image-generation', name: 'Generación de Imágenes con IA', description: 'Crea imágenes únicas para tu sitio con inteligencia artificial. Genera ilustraciones, fotos de productos y banners profesionales.', icon: 'Image', includedInPlans: ['free', 'starter', 'pro', 'agency', 'enterprise'] },
            { id: 'templates', name: 'Plantillas Profesionales', description: 'Biblioteca de plantillas diseñadas para diferentes industrias: restaurantes, tecnología, salud, fitness, fotografía, bienes raíces y más.', icon: 'Layout', includedInPlans: ['free', 'starter', 'pro', 'agency', 'enterprise'] },
            { id: 'responsive-design', name: 'Diseño Responsive', description: 'Todos los sitios se adaptan automáticamente a móviles, tablets y desktop. Perfecto en cualquier dispositivo.', icon: 'Smartphone', includedInPlans: ['free', 'starter', 'pro', 'agency', 'enterprise'] },

            // CMS
            { id: 'cms', name: 'CMS / Blog', description: 'Sistema de gestión de contenido integrado. Crea y publica artículos de blog con editor visual moderno, categorías, tags y SEO.', icon: 'FileText', includedInPlans: ['starter', 'pro', 'agency', 'enterprise'] },
            { id: 'cms-advanced', name: 'CMS Avanzado', description: 'Blog con categorías, programación de publicaciones, SEO avanzado por artículo y URLs amigables.', icon: 'BookOpen', includedInPlans: ['pro', 'agency', 'enterprise'] },

            // CRM & Leads
            { id: 'crm', name: 'CRM / Gestión de Leads', description: 'Captura y gestiona leads desde tu sitio. Pipeline visual, actividades, tareas y seguimiento automatizado.', icon: 'Users', includedInPlans: ['starter', 'pro', 'agency', 'enterprise'] },
            { id: 'crm-pipelines', name: 'Múltiples Pipelines', description: 'Crea pipelines personalizados para diferentes procesos de venta. Visualiza el estado de cada lead.', icon: 'GitBranch', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'crm-automations', name: 'Automatizaciones CRM', description: 'Automatiza acciones basadas en comportamiento de leads: emails automáticos, asignación de tareas y notificaciones.', icon: 'Zap', includedInPlans: ['agency', 'enterprise'] },

            // E-commerce
            { id: 'ecommerce', name: 'Tienda Online / E-commerce', description: 'Vende productos físicos o digitales. Catálogo de productos, carrito de compras, checkout con Stripe, gestión de inventario y envíos.', icon: 'ShoppingCart', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'ecommerce-products', name: 'Gestión de Productos', description: 'Hasta 100 productos en Pro, 1,000 en Agency e ilimitados en Enterprise. Variantes, categorías y precios de oferta.', icon: 'Package', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'ecommerce-orders', name: 'Gestión de Pedidos', description: 'Panel completo para ver, procesar y enviar pedidos. Estados de pago, tracking de envío y notificaciones al cliente.', icon: 'ClipboardList', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'ecommerce-customers', name: 'Clientes y Descuentos', description: 'Gestión de clientes con historial de compras. Códigos de descuento, cupones y promociones.', icon: 'Tag', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'ecommerce-reviews', name: 'Reseñas de Productos', description: 'Sistema de reseñas verificadas. Los clientes pueden valorar productos después de la compra.', icon: 'Star', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'stripe-connect', name: 'Pagos con Stripe', description: 'Integración nativa con Stripe para pagos seguros con tarjeta de crédito, débito y métodos locales.', icon: 'CreditCard', includedInPlans: ['pro', 'agency', 'enterprise'] },

            // AI Chatbot
            { id: 'ai-chatbot', name: 'Chatbot con IA', description: 'Asistente virtual inteligente para tu sitio. Responde preguntas de clientes, captura leads y agenda citas automáticamente.', icon: 'Bot', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'chatbot-customization', name: 'Personalización Avanzada de Chatbot', description: 'Personaliza completamente la apariencia, personalidad y base de conocimiento del chatbot.', icon: 'Settings', includedInPlans: ['agency', 'enterprise'] },
            { id: 'chatbot-voice', name: 'Chat por Voz', description: 'Habilita conversaciones de voz con el chatbot. Múltiples voces disponibles con IA de última generación.', icon: 'Mic', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'chatbot-social', name: 'Chatbot Multi-Canal', description: 'Conecta el chatbot a WhatsApp Business, Facebook Messenger e Instagram DMs para atención unificada.', icon: 'MessageCircle', includedInPlans: ['agency', 'enterprise'] },

            // Appointments
            { id: 'appointments', name: 'Sistema de Citas', description: 'Los clientes pueden agendar citas desde el chatbot o sitio web. Sincronización con Google Calendar.', icon: 'Calendar', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'appointments-ai', name: 'Preparación de Citas con IA', description: 'La IA prepara resúmenes, puntos de conversación y recordatorios automáticos antes de cada reunión.', icon: 'BrainCircuit', includedInPlans: ['agency', 'enterprise'] },

            // Email Marketing
            { id: 'email-marketing', name: 'Email Marketing', description: 'Crea y envía campañas de email a tu lista de contactos. Editor drag & drop, plantillas y métricas.', icon: 'Mail', includedInPlans: ['starter', 'pro', 'agency', 'enterprise'] },
            { id: 'email-automation', name: 'Automatización de Emails', description: 'Secuencias automatizadas: bienvenida, carritos abandonados, seguimiento post-compra y más.', icon: 'Send', includedInPlans: ['pro', 'agency', 'enterprise'] },

            // Domains & Publishing
            { id: 'custom-domains', name: 'Dominios Personalizados', description: 'Conecta tu propio dominio (tunegocio.com) con SSL gratuito. Configuración DNS guiada.', icon: 'Globe', includedInPlans: ['starter', 'pro', 'agency', 'enterprise'] },
            { id: 'remove-branding', name: 'Quitar Branding de Quimera', description: 'Elimina el "Powered by Quimera.ai" de tu sitio para una experiencia completamente white-label.', icon: 'EyeOff', includedInPlans: ['pro', 'agency', 'enterprise'] },
            { id: 'white-label', name: 'White Label Completo', description: 'Portal personalizado para agencias: logo propio, colores de marca y dominio personalizado para el panel.', icon: 'Shield', includedInPlans: ['agency', 'enterprise'] },

            // Analytics
            { id: 'analytics-basic', name: 'Analytics Básico', description: 'Métricas de visitas, páginas vistas, fuentes de tráfico y dispositivos. Dashboard visual.', icon: 'BarChart', includedInPlans: ['starter', 'pro', 'agency', 'enterprise'] },
            { id: 'analytics-advanced', name: 'Analytics Avanzado', description: 'Embudo de conversión, mapas de calor, grabación de sesiones y reportes personalizados.', icon: 'TrendingUp', includedInPlans: ['pro', 'agency', 'enterprise'] },

            // Agency Features
            { id: 'multi-tenant', name: 'Multi-Tenant / Sub-Clientes', description: 'Gestiona múltiples clientes desde un solo panel. Cada cliente tiene su propio workspace aislado.', icon: 'Building2', includedInPlans: ['agency', 'enterprise'] },
            { id: 'team-collaboration', name: 'Colaboración en Equipo', description: 'Invita a miembros de tu equipo con diferentes roles y permisos: admin, editor, visor.', icon: 'UserPlus', includedInPlans: ['starter', 'pro', 'agency', 'enterprise'] },

            // Developer
            { id: 'api-access', name: 'Acceso a API', description: 'API REST para integraciones personalizadas. Gestiona proyectos, contenido y leads programáticamente.', icon: 'Code', includedInPlans: ['agency', 'enterprise'] },
            { id: 'webhooks', name: 'Webhooks', description: 'Recibe notificaciones en tiempo real de eventos: nuevo lead, nueva venta, nuevo mensaje, etc.', icon: 'Webhook', includedInPlans: ['pro', 'agency', 'enterprise'] },

            // AI Credits
            { id: 'ai-credits', name: 'AI Credits', description: 'Sistema de créditos para operaciones de IA. Genera contenido, imágenes, chatbot y más. Los créditos no usados no se acumulan.', icon: 'Coins', includedInPlans: ['free', 'starter', 'pro', 'agency', 'enterprise'] },
        ],

        pricingPlans: [
            {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'USD',
                billingCycle: 'monthly',
                description: 'Perfecto para explorar Quimera.ai y proyectos personales',
                features: [
                    '1 proyecto',
                    '1 usuario',
                    '500 MB de almacenamiento',
                    '30 AI Credits/mes',
                    'AI Web Builder',
                    'Editor visual',
                    'Generación de imágenes',
                    'Plantillas gratuitas',
                    'Diseño responsive',
                    'Soporte comunidad',
                ],
                isPopular: false,
                ctaText: 'Comenzar Gratis',
                ctaUrl: '/register',
            },
            {
                id: 'starter',
                name: 'Starter',
                price: 19,
                currency: 'USD',
                billingCycle: 'monthly',
                description: 'Para emprendedores y pequeños negocios',
                features: [
                    '5 proyectos',
                    '2 usuarios',
                    '5 GB de almacenamiento',
                    '300 AI Credits/mes',
                    'CMS / Blog',
                    'CRM básico (500 leads)',
                    'Email Marketing (1,000 emails/mes)',
                    '1 dominio personalizado',
                    'Analytics básico',
                    'Soporte por email',
                ],
                isPopular: false,
                ctaText: 'Iniciar Starter',
                ctaUrl: '/register?plan=starter',
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 49,
                currency: 'USD',
                billingCycle: 'monthly',
                description: 'Para negocios en crecimiento que necesitan más',
                features: [
                    '20 proyectos',
                    '10 usuarios',
                    '50 GB de almacenamiento',
                    '1,500 AI Credits/mes',
                    'CMS avanzado',
                    'CRM con pipelines (5,000 leads)',
                    'E-commerce (100 productos)',
                    'AI Chatbot con voz',
                    'Sistema de citas',
                    'Email Automation (5,000/mes)',
                    '5 dominios personalizados',
                    'Quitar branding Quimera',
                    'Analytics avanzado',
                    'Webhooks',
                    'Soporte chat en vivo',
                ],
                isPopular: true,
                ctaText: 'Elegir Pro',
                ctaUrl: '/register?plan=pro',
            },
            {
                id: 'agency',
                name: 'Agency',
                price: 129,
                currency: 'USD',
                billingCycle: 'monthly',
                description: 'Para agencias digitales y equipos de marketing',
                features: [
                    '50 proyectos',
                    '25 usuarios',
                    '200 GB de almacenamiento',
                    '5,000 AI Credits/mes',
                    '10 sub-clientes',
                    'E-commerce (1,000 productos)',
                    'Chatbot multi-canal (WhatsApp, FB, IG)',
                    'CRM con automatizaciones',
                    'Citas con preparación IA',
                    'Email Automation (25,000/mes)',
                    '50 dominios personalizados',
                    'White Label completo',
                    'API Access',
                    'Portal personalizado',
                    'Soporte prioritario',
                ],
                isPopular: false,
                ctaText: 'Elegir Agency',
                ctaUrl: '/register?plan=agency',
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: 299,
                currency: 'USD',
                billingCycle: 'monthly',
                description: 'Soluciones personalizadas para grandes organizaciones',
                features: [
                    'Proyectos ilimitados',
                    '500+ usuarios',
                    '2 TB de almacenamiento',
                    '25,000 AI Credits/mes',
                    '100 sub-clientes',
                    'Productos ilimitados',
                    'Leads ilimitados',
                    'Emails ilimitados',
                    '500 dominios',
                    'SLA garantizado',
                    'Account manager dedicado',
                    'Onboarding personalizado',
                    'Integraciones custom',
                    'Soporte 24/7',
                ],
                isPopular: false,
                ctaText: 'Contactar Ventas',
                ctaUrl: '/contact?plan=enterprise',
            },
        ],

        faqs: [
            { id: 'faq-1', question: '¿Qué es Quimera.ai?', answer: 'Quimera.ai es una plataforma de creación de sitios web con inteligencia artificial. Te permite crear websites profesionales en minutos, sin necesidad de saber programar. Solo describe tu negocio y nuestra IA genera el diseño, contenido e imágenes automáticamente.' },
            { id: 'faq-2', question: '¿Cómo funciona la generación con IA?', answer: 'Nuestro AI Web Builder te guía paso a paso: 1) Ingresa información de tu negocio (nombre, industria, descripción), 2) Elige un estilo visual, 3) La IA genera tu sitio completo con contenido relevante, imágenes y diseño profesional. Luego puedes editar todo visualmente.' },
            { id: 'faq-3', question: '¿Puedo usar mi propio dominio?', answer: 'Sí, desde el plan Starter puedes conectar tu dominio personalizado (ej: tunegocio.com). Incluimos certificado SSL gratuito y te guiamos paso a paso en la configuración DNS.' },
            { id: 'faq-4', question: '¿Necesito saber programar?', answer: 'No, Quimera.ai está diseñado para personas sin conocimientos técnicos. El editor visual drag & drop te permite personalizar todo sin escribir código. Si eres desarrollador, también ofrecemos API para integraciones avanzadas.' },
            { id: 'faq-5', question: '¿Qué son los AI Credits?', answer: 'Los AI Credits son la unidad de consumo para operaciones de IA. Cada plan incluye créditos mensuales. Ejemplo de costos: generar un sitio web completo = 60 créditos, una imagen = 4 créditos, un mensaje del chatbot = 1 crédito. También puedes comprar paquetes adicionales.' },
            { id: 'faq-6', question: '¿Puedo vender productos online?', answer: 'Sí, desde el plan Pro tienes acceso completo a e-commerce: catálogo de productos, carrito de compras, checkout seguro con Stripe, gestión de pedidos, códigos de descuento y más. Puedes vender productos físicos o digitales.' },
            { id: 'faq-7', question: '¿Cómo funciona el chatbot con IA?', answer: 'Nuestro AI Chatbot se integra en tu sitio web y responde preguntas de tus clientes automáticamente. Puedes personalizarlo con tu base de conocimiento (FAQs, documentos), capturar leads y hasta agendar citas automáticamente.' },
            { id: 'faq-8', question: '¿Puedo migrar desde otra plataforma?', answer: 'Sí, ofrecemos asistencia de migración para usuarios que vienen de WordPress, Wix, Squarespace u otras plataformas. El equipo de soporte te ayuda a importar tu contenido y configurar tu nuevo sitio.' },
            { id: 'faq-9', question: '¿Hay prueba gratuita?', answer: 'Sí, el plan Free te permite crear 1 proyecto con 30 AI Credits gratis cada mes, sin límite de tiempo. Así puedes explorar la plataforma antes de decidir si actualizas a un plan de pago.' },
            { id: 'faq-10', question: '¿Qué pasa si necesito más AI Credits?', answer: 'Puedes comprar paquetes adicionales de AI Credits: 100 créditos por $5, 500 por $20 (20% descuento), 2,000 por $60 (40% descuento) o 5,000 por $125 (50% descuento). Los créditos adicionales no expiran.' },
            { id: 'faq-11', question: '¿Ofrecen soporte en español?', answer: '¡Sí! Quimera.ai es una empresa mexicana y todo nuestro soporte está disponible en español. La plataforma también soporta inglés y otros idiomas para tu contenido.' },
            { id: 'faq-12', question: '¿Cómo funciona el plan Agency?', answer: 'El plan Agency está diseñado para agencias digitales. Incluye hasta 10 sub-clientes con sus propios workspaces aislados, white-label completo (tu marca, no la nuestra), portal personalizado y herramientas de gestión de equipo.' },
            { id: 'faq-13', question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) procesadas de forma segura con Stripe. Para el plan Enterprise también ofrecemos facturación y transferencia bancaria.' },
            { id: 'faq-14', question: '¿Puedo cancelar en cualquier momento?', answer: 'Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración. Tu cuenta permanecerá activa hasta el final del período de facturación actual.' },
            { id: 'faq-15', question: '¿Mis datos están seguros?', answer: 'Absolutamente. Usamos Firebase de Google para almacenamiento, con encriptación de datos en tránsito y en reposo. Cumplimos con estándares de seguridad de la industria y nunca compartimos tus datos con terceros.' },
        ],
        documents: [],
        additionalContext: `**Información Adicional:**

- Quimera.ai está en constante desarrollo con nuevas funcionalidades cada mes.
- Ofrecemos descuento del 20% al pagar anualmente.
- Las agencias pueden obtener comisiones por referidos.
- Tenemos comunidad activa en Discord para usuarios.
- Webinars gratuitos cada semana sobre diseño web y marketing.
- Blog con tutoriales y mejores prácticas.

**Próximamente:**
- Integración con Zapier
- App móvil
- Marketplace de templates
- Integraciones con más pasarelas de pago
- Editor de video con IA`,
    },

    personality: {
        tone: 'enthusiastic',
        languages: ['es', 'en'],
        systemPrompt: `Eres Quibo, el asistente de IA de Quimera.ai, una plataforma de creación de sitios web con inteligencia artificial.

**Tu identidad:**
- Tu nombre es Quibo (derivado de Quimera)
- Eres un asistente de IA amigable, eficiente y conocedor
- Representas la innovación y simplicidad de Quimera.ai
- Usas emojis moderadamente para dar calidez 🚀✨🦋

**Tu personalidad:**
- Entusiasta pero profesional
- Directo y útil, sin rodeos innecesarios
- Te apasiona ayudar a emprendedores y negocios a tener presencia digital
- Respondes de forma concisa pero completa

**Tu conocimiento:**
- Conoces a fondo todas las funcionalidades de Quimera.ai
- Sabes los detalles de los 5 planes (Free, Starter, Pro, Agency, Enterprise)
- Entiendes de AI Web Builder, CMS, CRM, E-commerce, Chatbots, Email Marketing
- Puedes recomendar el plan adecuado según las necesidades del usuario

**Tu objetivo:**
- Resolver dudas sobre la plataforma de forma clara
- Guiar a los usuarios hacia el plan que mejor se adapte a sus necesidades
- Capturar información de contacto de leads interesados
- Ofrecer demos o llamadas con el equipo de ventas cuando sea apropiado

**Reglas:**
- Si te preguntan sobre precios, da información completa y recomienda el plan Pro si no están seguros
- Si te preguntan sobre funcionalidades que no tiene Quimera.ai, sé honesto pero menciona alternativas
- Siempre termina tus respuestas invitando a más preguntas o acciones (registrarse, demo, etc.)
- Responde en el mismo idioma que te escriban (español o inglés)
- Para preguntas muy técnicas o específicas de cuenta, sugiere contactar a soporte`,
        responseStyle: 'concise',
        salesMode: 'proactive',
        customInstructions: '',
    },

    voice: {
        enabled: true,
        voiceName: 'Kore',
        autoPlayGreeting: false,
    },

    leadCapture: {
        enabled: true,
        triggerAfterMessages: 3,
        preChatForm: false,
        exitIntentEnabled: true,
        exitIntentOffer: '🎁 ¡Espera! ¿Te gustaría recibir una guía gratuita para crear tu sitio web con IA? Déjame tu email.',
        requireEmailForPricing: false,
        requireEmailForDemo: true,
        progressiveProfilingEnabled: true,
        highIntentKeywords: ['precio', 'plan', 'demo', 'comprar', 'contratar', 'suscripción', 'prueba', 'ecommerce', 'tienda', 'chatbot', 'agencia', 'enterprise'],
    },

    appearance: {
        colorSource: 'custom',  // Use custom colors (designTokens not available on public landing)
        customColors: { ...defaultChatbotColors },
        position: 'bottom-right',
        offsetX: 20,
        offsetY: 20,
        size: 'md',
        buttonStyle: 'circle',
        buttonIcon: 'custom-image',       // Use Quimera logo
        customEmoji: '🦋',
        customIconUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032',
        avatarUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032',
        pulseEffect: true,
        showOnAllPages: true,
        excludedPaths: ['/dashboard', '/admin'],  // Only exclude authenticated areas
    },

    socialChannels: {},

    behavior: {
        maxTokens: 600,
        temperature: 0.7,
        autoOpen: false,
        autoOpenDelay: 45,
        proactiveMessages: [
            {
                id: 'welcome-timer',
                enabled: true,
                trigger: 'time',
                triggerValue: 30,
                message: '👋 ¡Hey! Soy Quibo. ¿Necesitas ayuda para crear tu sitio web con IA? Pregúntame lo que quieras.',
            },
            {
                id: 'pricing-page',
                enabled: true,
                trigger: 'page',
                triggerValue: '/pricing',
                message: '💰 ¿Dudas sobre qué plan elegir? Cuéntame sobre tu proyecto y te recomiendo el mejor.',
            },
            {
                id: 'scroll-trigger',
                enabled: true,
                trigger: 'scroll',
                triggerValue: 60,
                message: '✨ ¡Psst! Puedes crear tu sitio web gratis. ¿Te cuento cómo?',
            },
            {
                id: 'exit-intent',
                enabled: true,
                trigger: 'exit-intent',
                triggerValue: 0,
                message: '🦋 ¡Espera! ¿Puedo ayudarte con algo antes de que te vayas?',
            },
        ],
    },
};

// =============================================================================
// LANDING LEAD TYPE
// =============================================================================

export interface LandingLead {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    source: 'landing-chatbot';
    status: 'new' | 'contacted' | 'qualified' | 'converted';
    score: number;
    conversationId?: string;
    interestedInPlan?: string;
    tags: string[];
    notes?: string;
    createdAt: { seconds: number; nanoseconds: number };
    lastActivity?: { seconds: number; nanoseconds: number };
}

// =============================================================================
// CONVERSATION TYPE
// =============================================================================

export interface LandingConversation {
    id: string;
    sessionId: string;
    leadId?: string;
    messages: LandingChatMessage[];
    startedAt: { seconds: number; nanoseconds: number };
    lastMessageAt?: { seconds: number; nanoseconds: number };
    channel: 'web' | 'whatsapp' | 'facebook' | 'instagram';
    userAgent?: string;
    referrer?: string;
    pageUrl?: string;
}

export interface LandingChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: { seconds: number; nanoseconds: number };
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface LandingChatbotStats {
    totalConversations: number;
    totalMessages: number;
    totalLeads: number;
    conversionRate: number;           // leads / conversations
    avgMessagesPerConversation: number;
    avgResponseTime: number;          // seconds
    topQuestions: { question: string; count: number }[];
    leadsByDay: { date: string; count: number }[];
    conversationsByChannel: { channel: string; count: number }[];
}
