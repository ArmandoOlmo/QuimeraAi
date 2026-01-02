/**
 * Subscription & AI Credits Types
 * Tipos para el sistema de suscripciones, planes y AI credits de Quimera AI
 */

// =============================================================================
// PLAN TYPES
// =============================================================================

export type SubscriptionPlanId = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';
export type BillingCycle = 'monthly' | 'annually';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';

/**
 * Límites de recursos por plan
 */
export interface PlanLimits {
    maxProjects: number;
    maxUsers: number;
    maxStorageGB: number;
    maxAiCredits: number;
    maxSubClients?: number;           // Solo para planes de agencia
    maxDomains: number;
    maxLeads: number;
    maxProducts: number;              // Para e-commerce
    maxEmailsPerMonth: number;
}

/**
 * Features habilitadas por plan
 */
export interface PlanFeatures {
    // Core features
    aiWebBuilder: boolean;
    visualEditor: boolean;
    templates: boolean;
    
    // CMS
    cmsEnabled: boolean;
    cmsAdvanced: boolean;             // Blog, categorías, SEO avanzado
    
    // CRM
    crmEnabled: boolean;
    crmPipelines: boolean;            // Múltiples pipelines
    crmAutomations: boolean;          // Automatizaciones
    
    // E-commerce
    ecommerceEnabled: boolean;
    ecommerceTransactionFee: number;  // 0 = sin fee, 2 = 2%, etc.
    
    // AI Features
    chatbotEnabled: boolean;
    chatbotCustomization: boolean;    // Personalización avanzada
    aiAssistant: boolean;
    aiImageGeneration: boolean;
    
    // Communication
    emailMarketing: boolean;
    emailAutomation: boolean;
    
    // Branding
    customDomains: boolean;
    removeBranding: boolean;          // Quitar "Powered by Quimera"
    whiteLabel: boolean;              // Full white-label
    
    // Analytics
    analyticsBasic: boolean;
    analyticsAdvanced: boolean;
    
    // Support
    supportLevel: 'community' | 'email' | 'chat' | 'priority' | 'dedicated';
    
    // API
    apiAccess: boolean;
    webhooks: boolean;
}

/**
 * Definición completa de un plan de suscripción
 */
export interface SubscriptionPlan {
    id: SubscriptionPlanId;
    name: string;
    description: string;
    
    // Pricing
    price: {
        monthly: number;
        annually: number;              // Precio mensual si se paga anualmente
    };
    
    // Limits & Features
    limits: PlanLimits;
    features: PlanFeatures;
    
    // Display
    isFeatured: boolean;              // Destacar en pricing page
    isPopular: boolean;               // Badge "Popular"
    color: string;                    // Color del plan
    icon: string;                     // Icono del plan
    
    // Stripe
    stripeProductId?: string;
    stripePriceIdMonthly?: string;
    stripePriceIdAnnually?: string;
}

// =============================================================================
// AI CREDITS TYPES
// =============================================================================

/**
 * Tipos de operaciones que consumen AI credits
 */
export type AiCreditOperation = 
    | 'onboarding_complete'           // Generación completa de website
    | 'design_plan'                   // Generación de design plan
    | 'content_generation'            // Generación de contenido de sección
    | 'image_generation'              // Generación de imagen
    | 'image_generation_fast'         // Imagen con modelo rápido
    | 'image_generation_ultra'        // Imagen alta resolución
    | 'chatbot_message'               // Mensaje de chatbot
    | 'ai_assistant_request'          // Request al asistente IA
    | 'ai_assistant_complex'          // Request complejo (ediciones múltiples)
    | 'product_description'           // Descripción de producto con IA
    | 'seo_optimization'              // Optimización SEO con IA
    | 'email_generation'              // Generación de email con IA
    | 'translation';                  // Traducción con IA

/**
 * Costo en credits por operación
 */
export const AI_CREDIT_COSTS: Record<AiCreditOperation, number> = {
    onboarding_complete: 60,          // ~$0.60 costo real
    design_plan: 6,                   // ~$0.06 costo real
    content_generation: 1,            // ~$0.01 costo real
    image_generation: 4,              // ~$0.04 costo real (Imagen 3.0)
    image_generation_fast: 2,         // ~$0.02 costo real (Imagen 4.0 Fast)
    image_generation_ultra: 8,        // ~$0.08 costo real (Imagen 4.0 Ultra)
    chatbot_message: 1,               // ~$0.01 costo real (promedio 5 msgs)
    ai_assistant_request: 1,          // ~$0.01 costo real
    ai_assistant_complex: 3,          // ~$0.03 costo real
    product_description: 1,           // ~$0.01 costo real
    seo_optimization: 2,              // ~$0.02 costo real
    email_generation: 1,              // ~$0.01 costo real
    translation: 1,                   // ~$0.01 costo real
};

/**
 * Registro de consumo de AI credit
 */
export interface AiCreditTransaction {
    id: string;
    tenantId: string;
    userId: string;
    projectId?: string;
    
    // Operation details
    operation: AiCreditOperation;
    creditsUsed: number;
    description?: string;
    
    // Model info (para debugging y análisis)
    model?: string;
    tokensInput?: number;
    tokensOutput?: number;
    
    // Metadata
    timestamp: { seconds: number; nanoseconds: number };
    metadata?: Record<string, any>;
}

/**
 * Resumen de uso de AI credits
 */
export interface AiCreditsUsage {
    tenantId: string;
    
    // Current period
    periodStart: { seconds: number; nanoseconds: number };
    periodEnd: { seconds: number; nanoseconds: number };
    
    // Credits
    creditsIncluded: number;          // Credits incluidos en el plan
    creditsUsed: number;              // Credits usados en el período
    creditsRemaining: number;         // Credits restantes
    creditsOverage: number;           // Credits de overage (si aplica)
    
    // Breakdown by operation
    usageByOperation: Record<AiCreditOperation, number>;
    
    // Daily usage (últimos 30 días)
    dailyUsage: Array<{
        date: string;                 // YYYY-MM-DD
        credits: number;
    }>;
    
    // Last updated
    lastUpdated: { seconds: number; nanoseconds: number };
}

/**
 * Paquete de AI credits adicionales
 */
export interface AiCreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    pricePerCredit: number;
    discount: number;                 // Porcentaje de descuento vs precio base
    stripePriceId?: string;
    isPopular: boolean;
}

/**
 * Resultado de verificación de credits disponibles
 */
export interface CreditCheckResult {
    hasCredits: boolean;
    creditsRequired: number;
    creditsAvailable: number;
    wouldExceedLimit: boolean;
    suggestedAction?: 'upgrade' | 'buy_pack' | 'wait_reset';
    message?: string;
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * Estado de suscripción de un tenant
 */
export interface TenantSubscription {
    tenantId: string;
    
    // Plan info
    planId: SubscriptionPlanId;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
    
    // Dates
    startDate: { seconds: number; nanoseconds: number };
    currentPeriodStart: { seconds: number; nanoseconds: number };
    currentPeriodEnd: { seconds: number; nanoseconds: number };
    trialEndDate?: { seconds: number; nanoseconds: number };
    cancelledAt?: { seconds: number; nanoseconds: number };
    cancelAtPeriodEnd: boolean;
    
    // Stripe
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    
    // Add-ons
    addOns: SubscriptionAddOn[];
    
    // Credit packages purchased
    creditPackagesPurchased: Array<{
        packageId: string;
        credits: number;
        purchasedAt: { seconds: number; nanoseconds: number };
        expiresAt?: { seconds: number; nanoseconds: number };
    }>;
    
    // Usage
    aiCreditsUsage: AiCreditsUsage;
}

/**
 * Add-on de suscripción
 */
export interface SubscriptionAddOn {
    id: string;
    name: string;
    price: number;
    billingCycle: BillingCycle;
    stripePriceId?: string;
    isActive: boolean;
    addedAt: { seconds: number; nanoseconds: number };
}

// =============================================================================
// PLAN DEFINITIONS
// =============================================================================

/**
 * Definición de todos los planes de Quimera AI
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
    free: {
        id: 'free',
        name: 'Free',
        description: 'Perfecto para explorar y proyectos personales',
        price: { monthly: 0, annually: 0 },
        limits: {
            maxProjects: 1,
            maxUsers: 1,
            maxStorageGB: 0.5,
            maxAiCredits: 30,
            maxDomains: 0,
            maxLeads: 50,
            maxProducts: 0,
            maxEmailsPerMonth: 0,
        },
        features: {
            aiWebBuilder: true,
            visualEditor: true,
            templates: true,
            cmsEnabled: false,
            cmsAdvanced: false,
            crmEnabled: false,
            crmPipelines: false,
            crmAutomations: false,
            ecommerceEnabled: false,
            ecommerceTransactionFee: 0,
            chatbotEnabled: false,
            chatbotCustomization: false,
            aiAssistant: true,
            aiImageGeneration: true,
            emailMarketing: false,
            emailAutomation: false,
            customDomains: false,
            removeBranding: false,
            whiteLabel: false,
            analyticsBasic: false,
            analyticsAdvanced: false,
            supportLevel: 'community',
            apiAccess: false,
            webhooks: false,
        },
        isFeatured: false,
        isPopular: false,
        color: '#6b7280',
        icon: 'Sparkles',
    },
    
    starter: {
        id: 'starter',
        name: 'Starter',
        description: 'Para emprendedores y pequeños negocios',
        price: { monthly: 19, annually: 15 },
        limits: {
            maxProjects: 5,
            maxUsers: 2,
            maxStorageGB: 5,
            maxAiCredits: 300,
            maxDomains: 1,
            maxLeads: 500,
            maxProducts: 0,
            maxEmailsPerMonth: 1000,
        },
        features: {
            aiWebBuilder: true,
            visualEditor: true,
            templates: true,
            cmsEnabled: true,
            cmsAdvanced: false,
            crmEnabled: true,
            crmPipelines: false,
            crmAutomations: false,
            ecommerceEnabled: false,
            ecommerceTransactionFee: 0,
            chatbotEnabled: false,
            chatbotCustomization: false,
            aiAssistant: true,
            aiImageGeneration: true,
            emailMarketing: true,
            emailAutomation: false,
            customDomains: true,
            removeBranding: false,
            whiteLabel: false,
            analyticsBasic: true,
            analyticsAdvanced: false,
            supportLevel: 'email',
            apiAccess: false,
            webhooks: false,
        },
        isFeatured: false,
        isPopular: false,
        color: '#3b82f6',
        icon: 'Rocket',
    },
    
    pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Para negocios en crecimiento que necesitan más',
        price: { monthly: 49, annually: 39 },
        limits: {
            maxProjects: 20,
            maxUsers: 10,
            maxStorageGB: 50,
            maxAiCredits: 1500,
            maxDomains: 5,
            maxLeads: 5000,
            maxProducts: 100,
            maxEmailsPerMonth: 5000,
        },
        features: {
            aiWebBuilder: true,
            visualEditor: true,
            templates: true,
            cmsEnabled: true,
            cmsAdvanced: true,
            crmEnabled: true,
            crmPipelines: true,
            crmAutomations: false,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 2,
            chatbotEnabled: true,
            chatbotCustomization: false,
            aiAssistant: true,
            aiImageGeneration: true,
            emailMarketing: true,
            emailAutomation: true,
            customDomains: true,
            removeBranding: true,
            whiteLabel: false,
            analyticsBasic: true,
            analyticsAdvanced: true,
            supportLevel: 'chat',
            apiAccess: false,
            webhooks: true,
        },
        isFeatured: true,
        isPopular: true,
        color: '#8b5cf6',
        icon: 'Zap',
    },
    
    agency: {
        id: 'agency',
        name: 'Agency',
        description: 'Para agencias digitales y equipos',
        price: { monthly: 129, annually: 99 },
        limits: {
            maxProjects: 50,
            maxUsers: 25,
            maxStorageGB: 200,
            maxAiCredits: 5000,
            maxSubClients: 10,
            maxDomains: 50,
            maxLeads: 25000,
            maxProducts: 1000,
            maxEmailsPerMonth: 25000,
        },
        features: {
            aiWebBuilder: true,
            visualEditor: true,
            templates: true,
            cmsEnabled: true,
            cmsAdvanced: true,
            crmEnabled: true,
            crmPipelines: true,
            crmAutomations: true,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 1,
            chatbotEnabled: true,
            chatbotCustomization: true,
            aiAssistant: true,
            aiImageGeneration: true,
            emailMarketing: true,
            emailAutomation: true,
            customDomains: true,
            removeBranding: true,
            whiteLabel: true,
            analyticsBasic: true,
            analyticsAdvanced: true,
            supportLevel: 'priority',
            apiAccess: true,
            webhooks: true,
        },
        isFeatured: false,
        isPopular: false,
        color: '#10b981',
        icon: 'Building2',
    },
    
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Soluciones personalizadas para grandes organizaciones',
        price: { monthly: 299, annually: 249 },
        limits: {
            maxProjects: 1000,
            maxUsers: 500,
            maxStorageGB: 2000,
            maxAiCredits: 25000,
            maxSubClients: 100,
            maxDomains: 500,
            maxLeads: -1,             // Ilimitado (-1)
            maxProducts: -1,          // Ilimitado
            maxEmailsPerMonth: -1,    // Ilimitado
        },
        features: {
            aiWebBuilder: true,
            visualEditor: true,
            templates: true,
            cmsEnabled: true,
            cmsAdvanced: true,
            crmEnabled: true,
            crmPipelines: true,
            crmAutomations: true,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 0.5,
            chatbotEnabled: true,
            chatbotCustomization: true,
            aiAssistant: true,
            aiImageGeneration: true,
            emailMarketing: true,
            emailAutomation: true,
            customDomains: true,
            removeBranding: true,
            whiteLabel: true,
            analyticsBasic: true,
            analyticsAdvanced: true,
            supportLevel: 'dedicated',
            apiAccess: true,
            webhooks: true,
        },
        isFeatured: false,
        isPopular: false,
        color: '#f59e0b',
        icon: 'Crown',
    },
};

/**
 * Paquetes de AI credits disponibles para compra
 */
export const AI_CREDIT_PACKAGES: AiCreditPackage[] = [
    {
        id: 'pack_100',
        name: '100 Credits',
        credits: 100,
        price: 5,
        pricePerCredit: 0.05,
        discount: 0,
        isPopular: false,
    },
    {
        id: 'pack_500',
        name: '500 Credits',
        credits: 500,
        price: 20,
        pricePerCredit: 0.04,
        discount: 20,
        isPopular: true,
    },
    {
        id: 'pack_2000',
        name: '2,000 Credits',
        credits: 2000,
        price: 60,
        pricePerCredit: 0.03,
        discount: 40,
        isPopular: false,
    },
    {
        id: 'pack_5000',
        name: '5,000 Credits',
        credits: 5000,
        price: 125,
        pricePerCredit: 0.025,
        discount: 50,
        isPopular: false,
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Obtiene el plan por ID
 */
export function getPlanById(planId: SubscriptionPlanId): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[planId];
}

/**
 * Obtiene los límites de un plan
 */
export function getPlanLimits(planId: SubscriptionPlanId): PlanLimits {
    return SUBSCRIPTION_PLANS[planId].limits;
}

/**
 * Obtiene las features de un plan
 */
export function getPlanFeatures(planId: SubscriptionPlanId): PlanFeatures {
    return SUBSCRIPTION_PLANS[planId].features;
}

/**
 * Calcula el precio con descuento anual
 */
export function getAnnualSavings(planId: SubscriptionPlanId): number {
    const plan = SUBSCRIPTION_PLANS[planId];
    const monthlyTotal = plan.price.monthly * 12;
    const annualTotal = plan.price.annually * 12;
    return monthlyTotal - annualTotal;
}

/**
 * Verifica si un plan tiene una feature específica
 */
export function planHasFeature(planId: SubscriptionPlanId, feature: keyof PlanFeatures): boolean {
    const features = SUBSCRIPTION_PLANS[planId].features;
    return Boolean(features[feature]);
}

/**
 * Obtiene el costo en credits de una operación
 */
export function getCreditCost(operation: AiCreditOperation): number {
    return AI_CREDIT_COSTS[operation];
}

/**
 * Convierte límite -1 (ilimitado) a texto
 */
export function formatLimit(limit: number): string {
    return limit === -1 ? 'Ilimitado' : limit.toLocaleString();
}

/**
 * Calcula el porcentaje de uso de credits
 */
export function calculateCreditsUsagePercentage(used: number, total: number): number {
    if (total <= 0) return 100;
    return Math.min(100, Math.round((used / total) * 100));
}

/**
 * Obtiene el color del indicador de uso
 */
export function getUsageColor(percentage: number): string {
    if (percentage >= 90) return '#ef4444';  // Red
    if (percentage >= 70) return '#f59e0b';  // Amber
    if (percentage >= 50) return '#eab308';  // Yellow
    return '#10b981';                         // Green
}






