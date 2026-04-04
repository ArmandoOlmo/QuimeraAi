/**
 * useLandingPlans Hook
 * Carga los planes de suscripción desde Firestore para mostrar en el Landing Page
 * Conecta los planes del Super Admin con la UI pública
 */

import { useState, useEffect, useMemo } from 'react';
import { getActivePlans, StoredPlan } from '../services/plansService';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import { useServiceAvailability } from './useServiceAvailability';

// =============================================================================
// TYPES
// =============================================================================

export interface LandingPlan {
    id: string;
    name: string;
    price: string;
    priceValue: number;
    annualPrice: string;
    annualPriceValue: number;
    period: string;
    description: string;
    features: string[];
    featured: boolean;
    isPopular: boolean;
    color: string;
    order: number;
    landingOrder: number;
}

interface UseLandingPlansReturn {
    plans: LandingPlan[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Maps plan feature keys to their corresponding global PlatformServiceId.
 * Features not listed here have no service requirement (always shown).
 */
const FEATURE_SERVICE_MAP: Record<string, string> = {
    ecommerceEnabled: 'ecommerce',
    chatbotEnabled: 'chatbot',
    emailMarketing: 'emailMarketing',
    crmEnabled: 'crm',
    cmsEnabled: 'cms',
};

/**
 * Construye una lista de features legibles para mostrar en el landing.
 * If isServiceAvailable is provided, features whose global service is disabled
 * are silently filtered out.
 */
function buildFeaturesList(
    plan: StoredPlan,
    isServiceAvailable?: (serviceId: string) => boolean,
): string[] {
    const features: string[] = [];

    // Helper to check if a service-gated feature should be shown
    const shouldShow = (featureKey: string): boolean => {
        if (!isServiceAvailable) return true; // No filter ⇒ show all
        const serviceId = FEATURE_SERVICE_MAP[featureKey];
        if (!serviceId) return true; // No service mapping ⇒ always show
        return isServiceAvailable(serviceId);
    };

    // Límites
    if (plan.limits?.maxProjects) {
        const projects = plan.limits.maxProjects === -1
            ? 'Proyectos ilimitados'
            : `${plan.limits.maxProjects} proyecto${plan.limits.maxProjects > 1 ? 's' : ''}`;
        features.push(projects);
    }

    if (plan.limits?.maxAiCredits && plan.limits.maxAiCredits > 0) {
        const credits = plan.limits.maxAiCredits === -1
            ? 'AI Credits ilimitados'
            : `${plan.limits.maxAiCredits.toLocaleString()} AI Credits/mes`;
        features.push(credits);
    }

    if (plan.limits?.maxUsers && plan.limits.maxUsers > 1) {
        const users = plan.limits.maxUsers === -1
            ? 'Usuarios ilimitados'
            : `${plan.limits.maxUsers} usuarios`;
        features.push(users);
    }

    // Features (filtered by service availability)
    if (plan.features?.customDomains && shouldShow('customDomains')) {
        features.push('Dominios personalizados');
    }

    if (plan.features?.ecommerceEnabled && shouldShow('ecommerceEnabled')) {
        features.push('E-commerce integrado');
    }

    if (plan.features?.chatbotEnabled && shouldShow('chatbotEnabled')) {
        features.push('AI Chatbot');
    }

    if (plan.features?.emailMarketing && shouldShow('emailMarketing')) {
        features.push('Email Marketing');
    }

    if (plan.features?.crmEnabled && shouldShow('crmEnabled')) {
        features.push('CRM integrado');
    }

    if (plan.features?.analyticsAdvanced) {
        features.push('Analytics avanzados');
    } else if (plan.features?.analyticsBasic) {
        features.push('Analytics básicos');
    }

    if (plan.features?.whiteLabel) {
        features.push('White-label completo');
    } else if (plan.features?.removeBranding) {
        features.push('Sin branding Quimera');
    }

    if (plan.features?.apiAccess) {
        features.push('Acceso API');
    }

    if (plan.features?.supportLevel) {
        const supportLabels: Record<string, string> = {
            'community': 'Soporte comunidad',
            'email': 'Soporte por email',
            'chat': 'Soporte por chat',
            'priority': 'Soporte prioritario',
            'dedicated': 'Soporte dedicado',
        };
        const supportLabel = supportLabels[plan.features.supportLevel];
        if (supportLabel && plan.features.supportLevel !== 'community') {
            features.push(supportLabel);
        }
    }

    return features;
}

/**
 * Define el orden de visualización de los planes
 */
function getPlanOrder(planId: string): number {
    const orderMap: Record<string, number> = {
        'free': 0,
        'starter': 1,
        'pro': 2,
        'agency': 3,
        'enterprise': 4,
    };
    return orderMap[planId] ?? 99;
}

/**
 * Transforma un StoredPlan al formato LandingPlan
 */
function transformPlanForLanding(
    plan: StoredPlan,
    isServiceAvailable?: (serviceId: string) => boolean,
): LandingPlan {
    const priceValue = plan.price?.monthly ?? 0;
    const annualPriceValue = plan.price?.annually ?? priceValue;

    return {
        id: plan.id,
        name: plan.name,
        price: priceValue === 0 ? 'Gratis' : `$${priceValue}`,
        priceValue,
        annualPrice: priceValue === 0 ? 'Gratis' : `$${annualPriceValue}`,
        annualPriceValue,
        period: priceValue === 0 ? '' : '/mes',
        description: plan.description,
        features: buildFeaturesList(plan, isServiceAvailable),
        featured: plan.isFeatured ?? false,
        isPopular: plan.isPopular ?? false,
        color: plan.color || '#6b7280',
        order: getPlanOrder(plan.id),
        landingOrder: plan.landingOrder ?? 99,
    };
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook para cargar planes de suscripción desde Firestore
 * Solo muestra planes que tienen showInLanding = true
 * @param options.fallbackToAll - Si no hay planes con showInLanding, mostrar todos (default: true)
 */
export function useLandingPlans(options?: {
    fallbackToAll?: boolean;
}): UseLandingPlansReturn {
    const { fallbackToAll = true } = options ?? {};
    const { isServicePublic, isLoading: isLoadingServices } = useServiceAvailability();

    const [rawPlans, setRawPlans] = useState<StoredPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPlans = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Force refresh from Firestore to ensure latest showInLanding settings are loaded
            // This is important because the landing page needs to reflect admin changes immediately
            const activePlans = await getActivePlans(true);
            setRawPlans(activePlans);

        } catch (err) {
            console.error('Error loading landing plans:', err);
            setError('Error al cargar los planes');

            // Fallback a planes hardcodeados
            const fallbackPlans = Object.values(SUBSCRIPTION_PLANS) as StoredPlan[];
            setRawPlans(fallbackPlans);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    // Transformar y filtrar planes
    const plans = useMemo(() => {
        // Debug: Log all plans and their showInLanding status
        console.log('[useLandingPlans] Raw plans from Firestore:', rawPlans.map(p => ({
            id: p.id,
            name: p.name,
            showInLanding: p.showInLanding,
            landingOrder: p.landingOrder,
            isArchived: p.isArchived
        })));

        // Filtrar solo los planes que tienen showInLanding = true
        let landingPlans = rawPlans.filter(p => p.showInLanding === true);

        console.log('[useLandingPlans] Plans with showInLanding=true:', landingPlans.length);

        // Si no hay planes con showInLanding y fallbackToAll está activo,
        // mostrar los 3 planes pagados más relevantes como fallback
        if (landingPlans.length === 0 && fallbackToAll) {
            landingPlans = rawPlans
                .filter(p => (p.price?.monthly ?? 0) > 0)
                .sort((a, b) => {
                    // Priorizar: featured > popular > por precio
                    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
                    if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
                    return (a.price?.monthly ?? 0) - (b.price?.monthly ?? 0);
                })
                .slice(0, 3);
        }

        // Transformar y ordenar por landingOrder
        // Pass isServicePublic so plan features referencing disabled services are hidden
        const serviceFilter = isLoadingServices ? undefined : isServicePublic;
        return landingPlans
            .map(p => transformPlanForLanding(p, serviceFilter))
            .sort((a, b) => a.landingOrder - b.landingOrder);
    }, [rawPlans, fallbackToAll, isServicePublic, isLoadingServices]);

    return {
        plans,
        isLoading,
        error,
        refetch: loadPlans,
    };
}

export default useLandingPlans;
