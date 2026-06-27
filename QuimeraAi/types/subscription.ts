/**
 * Subscription & AI Credits Types
 * Tipos para el sistema de suscripciones, planes y AI credits de Quimera AI
 */

import {
    formatPlanLimit as formatCanonicalPlanLimit,
    getCanonicalPlan,
    getCanonicalPlanFeatures,
    getCanonicalPlanLimits,
    isAgencyPlan as isCanonicalAgencyPlan,
    normalizePlanId,
} from '../services/billing/planCatalog.ts';

// =============================================================================
// PLAN TYPES
// =============================================================================

export type SubscriptionPlanId = 
    | 'free' 
    | 'hobby'
    | 'starter'
    | 'pro'
    | 'individual'           // Plan Individual $49/mes
    | 'agency'
    | 'agency_plus'
    | 'agency_starter'       // Fee $99 + $29/proyecto
    | 'agency_pro'           // Fee $199 + $29/proyecto
    | 'agency_scale'         // Fee $399 + $29/proyecto
    | 'enterprise';
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
    maxReports?: number;              // Límite de reportes mensuales (Agency+)
    maxApiCalls?: number;             // Límite de llamadas API por mes
    includedProjects?: number;        // Proyectos incluidos antes de facturación variable
    maxBillableProjects?: number;     // Tope finito para planes pay-per-project
    projectCost?: number;             // Costo por proyecto activo
    hardLimit?: boolean;              // Si el runtime debe bloquear al alcanzar el límite
    billingModel?: 'free' | 'subscription' | 'pay_per_project' | 'custom_contract';
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
    realEstateModule?: boolean;       // Quimera Real Estate OS

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

    // Agency Engine
    agencyEnabled?: boolean;
    agencyModule?: boolean;
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

    // Agency-specific fields (Fase 3)
    isAgencyPlan?: boolean;           // Es plan de agencia con fee base + proyecto
    projectCost?: number;             // Costo por proyecto activo (ej: $29/mes)
    hasSharedCreditsPool?: boolean;   // Los créditos se comparten entre sub-clientes

    // Trial configuration
    trialDays?: number;               // Días de trial (default: 7 para Individual)
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
    | 'video_generation_seedance'   // Video Seedance 2.0
    | 'video_generation_veo'        // Video Google Veo 3.1
    | 'video_generation_omni'       // Video Gemini Omni
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
    video_generation_seedance: 121,   // Fallback mínimo: Seedance 2.0, 4s, 720p. El flujo real usa customCredits dinámicos.
    video_generation_veo: 320,        // Fallback mínimo: Veo 3.1, 4s, audio. El flujo real usa customCredits dinámicos.
    video_generation_omni: 480,       // Fallback conservador hasta que OpenRouter publique pricing Omni.
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
    /** Transaction direction for admin UI */
    type?: 'credit' | 'debit' | string;
    /** Signed credit delta (positive = add, negative = consume) */
    amount?: number;
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

    // === Pool compartido para agencias (Fase 4) ===
    parentTenantId?: string;          // Si es sub-cliente, ID de la agencia padre
    isAgencyPool?: boolean;           // Si este es el pool principal de una agencia
    subClientsUsage?: {               // Uso desglosado por sub-cliente (solo en pool de agencia)
        [subClientId: string]: {
            tenantName: string;
            creditsUsed: number;
            lastUpdated: { seconds: number; nanoseconds: number };
        };
    };
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
            maxStorageGB: 1,
            maxAiCredits: 60,
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
            realEstateModule: false,
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

    // =========================================================================
    // PLAN INDIVIDUAL - $49/mes con 7 días trial
    // 1 proyecto, todas las features habilitadas
    // =========================================================================
    individual: {
        id: 'individual',
        name: 'Individual',
        description: 'Todo incluido para emprendedores y freelancers',
        price: { monthly: 49, annually: 39 },
        limits: {
            maxProjects: 1,
            maxUsers: 1,
            maxStorageGB: 10,
            maxAiCredits: 500,
            maxDomains: 1,
            maxLeads: 1000,
            maxProducts: 100,
            maxEmailsPerMonth: 5000,
        },
        features: {
            // Todas las features habilitadas
            aiWebBuilder: true,
            visualEditor: true,
            templates: true,
            cmsEnabled: true,
            cmsAdvanced: true,
            crmEnabled: true,
            crmPipelines: true,
            crmAutomations: true,
            realEstateModule: true,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 2,        // 2% fee en transacciones
            chatbotEnabled: true,
            chatbotCustomization: true,
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
            apiAccess: true,                   // API básico incluido
            webhooks: true,
        },
        isFeatured: true,
        isPopular: true,
        color: '#6366f1',
        icon: 'User',
        trialDays: 7,                          // 7 días de trial gratis
    },

    // =========================================================================
    // PLANES DE AGENCIA - Fee base + $29/proyecto
    // Pool de créditos IA compartidos entre todos los sub-clientes
    // =========================================================================

    agency_starter: {
        id: 'agency_starter',
        name: 'Agency Starter',
        description: 'Para agencias que comienzan - Fee base + costo por proyecto',
        price: { monthly: 99, annually: 79 },
        limits: {
            maxProjects: 25,
            maxUsers: 5,
            maxStorageGB: 50,
            maxAiCredits: 2000,                // Pool compartido
            maxSubClients: 25,
            maxDomains: 25,
            maxLeads: 10000,
            maxProducts: 500,
            maxEmailsPerMonth: 10000,
            maxReports: 25,
            maxApiCalls: 5000,
            includedProjects: 0,
            maxBillableProjects: 25,
            projectCost: 29,
            hardLimit: true,
            billingModel: 'pay_per_project',
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
            realEstateModule: true,
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
        // Campos específicos de agencia
        isAgencyPlan: true,
        projectCost: 29,                       // $29/mes por proyecto activo
        hasSharedCreditsPool: true,            // Créditos compartidos
    },

    agency_pro: {
        id: 'agency_pro',
        name: 'Agency Pro',
        description: 'Para agencias en crecimiento - Más créditos y soporte',
        price: { monthly: 199, annually: 159 },
        limits: {
            maxProjects: 100,
            maxUsers: 15,
            maxStorageGB: 200,
            maxAiCredits: 5000,                // Pool compartido más grande
            maxSubClients: 100,
            maxDomains: 100,
            maxLeads: 50000,
            maxProducts: 2000,
            maxEmailsPerMonth: 50000,
            maxReports: 100,
            maxApiCalls: 25000,
            includedProjects: 0,
            maxBillableProjects: 100,
            projectCost: 29,
            hardLimit: true,
            billingModel: 'pay_per_project',
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
            realEstateModule: true,
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
            supportLevel: 'priority',
            apiAccess: true,
            webhooks: true,
        },
        isFeatured: true,
        isPopular: true,
        color: '#8b5cf6',
        icon: 'Building2',
        isAgencyPlan: true,
        projectCost: 29,
        hasSharedCreditsPool: true,
    },

    agency_scale: {
        id: 'agency_scale',
        name: 'Agency Scale',
        description: 'Para agencias de alto volumen - Máximos recursos',
        price: { monthly: 399, annually: 319 },
        limits: {
            maxProjects: 250,
            maxUsers: 50,
            maxStorageGB: 1000,
            maxAiCredits: 15000,               // Pool compartido máximo
            maxSubClients: 250,
            maxDomains: 250,
            maxLeads: 150000,
            maxProducts: 10000,
            maxEmailsPerMonth: 150000,
            maxReports: 500,
            maxApiCalls: 100000,
            includedProjects: 0,
            maxBillableProjects: 250,
            projectCost: 29,
            hardLimit: true,
            billingModel: 'pay_per_project',
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
            realEstateModule: true,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 0,        // Sin fee de transacción
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
        isAgencyPlan: true,
        projectCost: 29,
        hasSharedCreditsPool: true,
    },

    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Soluciones personalizadas para grandes organizaciones',
        price: { monthly: 299, annually: 249 },
        limits: {
            maxProjects: 500,
            maxUsers: 250,
            maxStorageGB: 2000,
            maxAiCredits: 25000,
            maxSubClients: 500,
            maxDomains: 500,
            maxLeads: 500000,
            maxProducts: 50000,
            maxEmailsPerMonth: 500000,
            maxReports: 1000,
            maxApiCalls: 250000,
            includedProjects: 500,
            maxBillableProjects: 500,
            projectCost: 0,
            hardLimit: true,
            billingModel: 'custom_contract',
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
            realEstateModule: true,
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

    // Legacy plan ids (backward compatibility with older subscriptions)
    hobby: {
        id: 'hobby',
        name: 'Hobby',
        description: 'Plan legacy — equivalente a Individual',
        price: { monthly: 19, annually: 15 },
        limits: {
            maxProjects: 3,
            maxUsers: 1,
            maxStorageGB: 5,
            maxAiCredits: 500,
            maxSubClients: 0,
            maxDomains: 1,
            maxLeads: 500,
            maxProducts: 50,
            maxEmailsPerMonth: 1000,
            maxReports: 10,
            maxApiCalls: 1000,
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
            realEstateModule: false,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 2,
            chatbotEnabled: true,
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
        color: '#6366f1',
        icon: 'User',
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        description: 'Plan legacy — equivalente a Individual',
        price: { monthly: 19, annually: 15 },
        limits: {
            maxProjects: 3,
            maxUsers: 1,
            maxStorageGB: 5,
            maxAiCredits: 500,
            maxSubClients: 0,
            maxDomains: 1,
            maxLeads: 500,
            maxProducts: 50,
            maxEmailsPerMonth: 1000,
            maxReports: 10,
            maxApiCalls: 1000,
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
            realEstateModule: false,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 2,
            chatbotEnabled: true,
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
        color: '#6366f1',
        icon: 'User',
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Plan legacy — equivalente a Individual',
        price: { monthly: 19, annually: 15 },
        limits: {
            maxProjects: 3,
            maxUsers: 1,
            maxStorageGB: 5,
            maxAiCredits: 500,
            maxSubClients: 0,
            maxDomains: 1,
            maxLeads: 500,
            maxProducts: 50,
            maxEmailsPerMonth: 1000,
            maxReports: 10,
            maxApiCalls: 1000,
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
            realEstateModule: false,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 2,
            chatbotEnabled: true,
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
        color: '#6366f1',
        icon: 'User',
    },
    agency: {
        id: 'agency',
        name: 'Agency',
        description: 'Plan legacy — equivalente a Agency Starter',
        price: { monthly: 99, annually: 79 },
        limits: {
            maxProjects: 10,
            maxUsers: 5,
            maxStorageGB: 50,
            maxAiCredits: 2000,
            maxSubClients: 10,
            maxDomains: 10,
            maxLeads: 10000,
            maxProducts: 500,
            maxEmailsPerMonth: 10000,
            maxReports: 25,
            maxApiCalls: 10000,
            includedProjects: 0,
            maxBillableProjects: 25,
            projectCost: 29,
            hardLimit: true,
            billingModel: 'pay_per_project',
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
            realEstateModule: true,
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
            whiteLabel: false,
            analyticsBasic: true,
            analyticsAdvanced: true,
            supportLevel: 'priority',
            apiAccess: true,
            webhooks: true,
        },
        isFeatured: false,
        isPopular: false,
        color: '#8b5cf6',
        icon: 'Building2',
        isAgencyPlan: true,
        projectCost: 29,
        hasSharedCreditsPool: true,
    },
    agency_plus: {
        id: 'agency_plus',
        name: 'Agency Plus',
        description: 'Plan legacy — equivalente a Agency Pro',
        price: { monthly: 199, annually: 159 },
        limits: {
            maxProjects: 100,
            maxUsers: 15,
            maxStorageGB: 200,
            maxAiCredits: 5000,
            maxSubClients: 100,
            maxDomains: 100,
            maxLeads: 50000,
            maxProducts: 2000,
            maxEmailsPerMonth: 50000,
            maxReports: 100,
            maxApiCalls: 25000,
            includedProjects: 0,
            maxBillableProjects: 100,
            projectCost: 29,
            hardLimit: true,
            billingModel: 'pay_per_project',
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
            realEstateModule: true,
            ecommerceEnabled: true,
            ecommerceTransactionFee: 0,
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
        color: '#8b5cf6',
        icon: 'Building2',
        isAgencyPlan: true,
        projectCost: 29,
        hasSharedCreditsPool: true,
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
    {
        id: 'pack_10000',
        name: '10,000 Credits',
        credits: 10000,
        price: 200,
        pricePerCredit: 0.02,
        discount: 60,
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
    return SUBSCRIPTION_PLANS[planId] || getCanonicalPlan(planId);
}

/**
 * Obtiene los límites de un plan
 */
export function getPlanLimits(planId: SubscriptionPlanId): PlanLimits {
    return getCanonicalPlanLimits(planId);
}

/**
 * Obtiene las features de un plan
 */
export function getPlanFeatures(planId: SubscriptionPlanId): PlanFeatures {
    return getCanonicalPlanFeatures(planId);
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
    const features = getCanonicalPlanFeatures(planId);
    return Boolean(features[feature]);
}

/**
 * Obtiene el costo en credits de una operación
 */
export function getCreditCost(operation: AiCreditOperation): number {
    return AI_CREDIT_COSTS[operation];
}

/**
 * Formatea límites finitos; valores inválidos no se tratan como ilimitados.
 */
export function formatLimit(limit: number): string {
    return formatCanonicalPlanLimit(limit);
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

// =============================================================================
// AGENCY PLAN HELPERS (Fase 3)
// =============================================================================

/**
 * Verifica si un plan es de tipo agencia con modelo fee + proyecto
 */
export function isAgencyPlan(planId: SubscriptionPlanId): boolean {
    return isCanonicalAgencyPlan(planId);
}

/**
 * Obtiene el costo por proyecto de un plan de agencia
 */
export function getProjectCost(planId: SubscriptionPlanId): number {
    const limits = getCanonicalPlanLimits(planId);
    return limits.projectCost ?? 0;
}

/**
 * Calcula el costo total mensual de un plan de agencia
 * @param planId - ID del plan
 * @param activeProjects - Número de proyectos activos
 * @param isAnnual - Si se paga anualmente
 */
export function calculateAgencyTotalCost(
    planId: SubscriptionPlanId, 
    activeProjects: number,
    isAnnual: boolean = false
): number {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!isCanonicalAgencyPlan(planId)) {
        return isAnnual ? plan.price.annually : plan.price.monthly;
    }
    
    const baseFee = isAnnual ? plan.price.annually : plan.price.monthly;
    const projectsCost = getProjectCost(planId) * activeProjects;
    
    return baseFee + projectsCost;
}

/**
 * Verifica si un plan tiene pool de créditos compartidos
 */
export function hasSharedCreditsPool(planId: SubscriptionPlanId): boolean {
    return isCanonicalAgencyPlan(planId);
}

/**
 * Obtiene los días de trial para un plan
 */
export function getPlanTrialDays(planId: SubscriptionPlanId): number {
    const plan = SUBSCRIPTION_PLANS[planId];
    return plan?.trialDays ?? 0;
}

/**
 * Obtiene todos los planes de tipo agencia
 */
export function getAgencyPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS).filter(plan => isCanonicalAgencyPlan(normalizePlanId(plan.id)));
}

/**
 * Obtiene los planes individuales (no agencia)
 */
export function getIndividualPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS).filter(plan => !isCanonicalAgencyPlan(normalizePlanId(plan.id)));
}
