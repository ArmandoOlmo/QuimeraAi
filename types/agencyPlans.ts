/**
 * Agency Plans Types
 * Types for agency-created service plans that they offer to their clients
 */

import { Timestamp } from 'firebase/firestore';

// =============================================================================
// AGENCY PLAN LIMITS
// =============================================================================

export interface AgencyPlanLimits {
    maxProjects: number;
    maxUsers: number;
    maxStorageGB: number;
    maxAiCredits: number;      // From shared pool
    maxProducts: number;       // E-commerce products
    maxLeads: number;          // CRM leads
    maxEmailsPerMonth: number; // Email marketing
}

// Default limits for new plans
export const DEFAULT_AGENCY_PLAN_LIMITS: AgencyPlanLimits = {
    maxProjects: 1,
    maxUsers: 3,
    maxStorageGB: 5,
    maxAiCredits: 500,
    maxProducts: 50,
    maxLeads: 500,
    maxEmailsPerMonth: 1000,
};

// =============================================================================
// AGENCY PLAN FEATURES
// =============================================================================

export interface AgencyPlanFeatures {
    // Core
    websiteBuilder: boolean;
    visualEditor: boolean;
    templates: boolean;
    
    // CMS
    cmsEnabled: boolean;
    
    // CRM
    crmEnabled: boolean;
    
    // E-commerce
    ecommerceEnabled: boolean;
    
    // Communication
    emailMarketing: boolean;
    chatbotEnabled: boolean;
    
    // Branding
    customDomain: boolean;
    removeBranding: boolean;
    
    // Analytics
    analyticsEnabled: boolean;
}

// Default features for new plans
export const DEFAULT_AGENCY_PLAN_FEATURES: AgencyPlanFeatures = {
    websiteBuilder: true,
    visualEditor: true,
    templates: true,
    cmsEnabled: true,
    crmEnabled: false,
    ecommerceEnabled: false,
    emailMarketing: false,
    chatbotEnabled: true,
    customDomain: false,
    removeBranding: false,
    analyticsEnabled: true,
};

// =============================================================================
// AGENCY PLAN
// =============================================================================

export interface AgencyPlan {
    id: string;
    tenantId: string;              // ID of the agency that owns this plan
    
    // Basic info
    name: string;
    description: string;
    color: string;                 // For UI display
    
    // Pricing
    price: number;                 // Price charged to client (monthly)
    baseCost: number;              // Quimera's cost ($29/project)
    
    // Computed (for display)
    markup?: number;               // price - baseCost
    markupPercentage?: number;     // ((price - baseCost) / baseCost) * 100
    
    // Limits & Features
    limits: AgencyPlanLimits;
    features: AgencyPlanFeatures;
    
    // Status
    isActive: boolean;
    isDefault: boolean;            // Default plan for new clients
    isArchived: boolean;
    
    // Stats
    clientCount: number;           // Number of clients using this plan
    
    // Timestamps
    createdAt: Timestamp | { seconds: number; nanoseconds: number };
    updatedAt: Timestamp | { seconds: number; nanoseconds: number };
    archivedAt?: Timestamp | { seconds: number; nanoseconds: number };
    
    // Audit
    createdBy?: string;
    updatedBy?: string;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface AgencyPlanStats {
    totalPlans: number;
    activePlans: number;
    totalClients: number;
    totalMRR: number;              // Monthly Recurring Revenue
    totalMarkup: number;           // Total monthly profit
    averageMarkupPercentage: number;
}

export interface AgencyPlanSummary {
    planId: string;
    planName: string;
    price: number;
    baseCost: number;
    markup: number;
    markupPercentage: number;
    clientCount: number;
    mrr: number;                   // price * clientCount
    monthlyProfit: number;         // markup * clientCount
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Quimera's project cost for agencies (from subscription.ts)
export const QUIMERA_PROJECT_COST = 29;

// Plan colors for UI
export const AGENCY_PLAN_COLORS = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Púrpura', value: '#8b5cf6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Indigo', value: '#6366f1' },
];

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createEmptyAgencyPlan(tenantId: string): Partial<AgencyPlan> {
    return {
        tenantId,
        name: '',
        description: '',
        color: '#3b82f6',
        price: 99,
        baseCost: QUIMERA_PROJECT_COST,
        limits: { ...DEFAULT_AGENCY_PLAN_LIMITS },
        features: { ...DEFAULT_AGENCY_PLAN_FEATURES },
        isActive: true,
        isDefault: false,
        isArchived: false,
        clientCount: 0,
    };
}

export function calculateMarkup(price: number, baseCost: number = QUIMERA_PROJECT_COST): {
    markup: number;
    markupPercentage: number;
} {
    const markup = price - baseCost;
    const markupPercentage = baseCost > 0 ? ((price - baseCost) / baseCost) * 100 : 0;
    return { markup, markupPercentage };
}

export function calculatePlanSummary(plan: AgencyPlan): AgencyPlanSummary {
    const { markup, markupPercentage } = calculateMarkup(plan.price, plan.baseCost);
    return {
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        baseCost: plan.baseCost,
        markup,
        markupPercentage,
        clientCount: plan.clientCount,
        mrr: plan.price * plan.clientCount,
        monthlyProfit: markup * plan.clientCount,
    };
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface AgencyPlanValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateAgencyPlan(plan: Partial<AgencyPlan>): AgencyPlanValidationResult {
    const errors: string[] = [];
    
    if (!plan.tenantId) {
        errors.push('El ID del tenant es requerido');
    }
    
    if (!plan.name || plan.name.trim().length === 0) {
        errors.push('El nombre del plan es requerido');
    }
    
    if (plan.name && plan.name.length > 50) {
        errors.push('El nombre del plan no puede exceder 50 caracteres');
    }
    
    if (plan.price === undefined || plan.price < 0) {
        errors.push('El precio debe ser un número positivo');
    }
    
    if (plan.price !== undefined && plan.price < QUIMERA_PROJECT_COST) {
        errors.push(`El precio mínimo debe ser $${QUIMERA_PROJECT_COST} (costo base de Quimera)`);
    }
    
    if (plan.limits) {
        if (plan.limits.maxProjects < 1) {
            errors.push('Debe permitir al menos 1 proyecto');
        }
        if (plan.limits.maxUsers < 1) {
            errors.push('Debe permitir al menos 1 usuario');
        }
        if (plan.limits.maxAiCredits < 0) {
            errors.push('Los créditos AI deben ser un número positivo');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}
