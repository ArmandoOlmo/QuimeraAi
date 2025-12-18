/**
 * UpgradeModal Component
 * Modal reutilizable para mostrar opciones de upgrade cuando el usuario
 * alcanza límites de su plan actual.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Check,
    Zap,
    Sparkles,
    Crown,
    Rocket,
    Building2,
    AlertTriangle,
    ArrowRight,
    CreditCard,
    Gift,
    Loader2,
} from 'lucide-react';
import { useLandingPlans } from '../../hooks/useLandingPlans';
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from '../../types/subscription';
import { updateSubscriptionPlan } from '../../services/subscriptionService';
import { useSafeTenant } from '../../contexts/tenant';
import { getFunctions, httpsCallable } from 'firebase/functions';

// =============================================================================
// TYPES
// =============================================================================

export type UpgradeTrigger = 
    | 'credits'      // AI Credits agotándose
    | 'projects'     // Límite de proyectos
    | 'domains'      // Dominios personalizados
    | 'ecommerce'    // E-commerce no disponible
    | 'chatbot'      // Chatbot no disponible
    | 'users'        // Límite de usuarios
    | 'storage'      // Límite de almacenamiento
    | 'generic';     // Upgrade genérico

export interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    trigger: UpgradeTrigger;
    currentPlanId?: SubscriptionPlanId;
    metadata?: {
        creditsRemaining?: number;
        creditsTotal?: number;
        currentProjects?: number;
        maxProjects?: number;
        featureName?: string;
    };
    onSelectPlan?: (planId: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TRIGGER_ICONS: Record<UpgradeTrigger, React.ElementType> = {
    credits: Sparkles,
    projects: Rocket,
    domains: Crown,
    ecommerce: Building2,
    chatbot: Zap,
    users: Crown,
    storage: AlertTriangle,
    generic: Sparkles,
};

const PLAN_ICONS: Record<string, React.ElementType> = {
    free: Sparkles,
    starter: Rocket,
    pro: Zap,
    agency: Building2,
    enterprise: Crown,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getPlanOrder(planId: string): number {
    const order: Record<string, number> = {
        free: 0,
        starter: 1,
        pro: 2,
        agency: 3,
        enterprise: 4,
    };
    return order[planId] ?? 99;
}

// =============================================================================
// COMPONENT
// =============================================================================

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    trigger,
    currentPlanId = 'free',
    metadata,
    onSelectPlan,
}) => {
    const { t } = useTranslation();
    const { plans, isLoading } = useLandingPlans({ fallbackToAll: true });
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tenantContext = useSafeTenant();

    // Get trigger icon
    const TriggerIcon = TRIGGER_ICONS[trigger];

    // Filter plans to show only upgrades from current plan
    const upgradePlans = useMemo(() => {
        const currentOrder = getPlanOrder(currentPlanId);
        return plans
            .filter(plan => getPlanOrder(plan.id) > currentOrder)
            .sort((a, b) => getPlanOrder(a.id) - getPlanOrder(b.id))
            .slice(0, 3); // Show max 3 plans
    }, [plans, currentPlanId]);

    // Get recommended plan based on trigger
    const recommendedPlanId = useMemo(() => {
        switch (trigger) {
            case 'credits':
            case 'projects':
                return 'starter';
            case 'ecommerce':
            case 'chatbot':
                return 'pro';
            case 'domains':
            case 'users':
                return 'agency';
            default:
                return 'pro';
        }
    }, [trigger]);

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        setError(null);
        if (onSelectPlan) {
            onSelectPlan(planId);
        }
    };

    const handleUpgrade = async () => {
        if (!selectedPlanId) {
            setError('Por favor selecciona un plan');
            return;
        }
        
        if (!tenantContext?.currentTenantId) {
            setError('Error: No se encontró el workspace. Por favor recarga la página.');
            console.error('No tenantId available for upgrade');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Try to create a Stripe checkout session first
            const functions = getFunctions();
            const createCheckout = httpsCallable(functions, 'createSubscriptionCheckout');
            
            console.log('Creating checkout session...', {
                tenantId: tenantContext.currentTenantId,
                planId: selectedPlanId,
                billingCycle,
            });
            
            const result = await createCheckout({
                tenantId: tenantContext.currentTenantId,
                planId: selectedPlanId,
                billingCycle,
                successUrl: `${window.location.origin}/settings/subscription?success=true&plan=${selectedPlanId}`,
                cancelUrl: `${window.location.origin}/settings/subscription?cancelled=true`,
            });

            const data = result.data as { url?: string; sessionId?: string };
            
            if (data.url) {
                // Redirect to Stripe Checkout
                console.log('Redirecting to Stripe Checkout:', data.url);
                window.location.href = data.url;
                return;
            } else {
                throw new Error('No se recibió URL de checkout');
            }
        } catch (stripeError: any) {
            console.error('Stripe checkout error:', stripeError);
            
            // Show specific error message from Stripe/Firebase
            const errorMessage = stripeError?.message || stripeError?.code || 'Error desconocido';
            
            // If it's a Firebase Functions error, try to extract the message
            if (stripeError?.details) {
                setError(`Error de pago: ${stripeError.details}`);
            } else if (errorMessage.includes('not-found')) {
                setError('El plan seleccionado no está configurado en Stripe. Contacta soporte.');
            } else if (errorMessage.includes('unauthenticated')) {
                setError('Debes iniciar sesión para continuar.');
            } else {
                // Try fallback to direct update (for testing/demo)
                console.log('Trying direct subscription update as fallback...');
                try {
                    const updateResult = await updateSubscriptionPlan(
                        tenantContext.currentTenantId,
                        selectedPlanId as SubscriptionPlanId,
                        billingCycle
                    );

                    if (updateResult.success) {
                        onClose();
                        window.location.reload();
                        return;
                    } else {
                        setError(updateResult.error || 'Error al actualizar el plan');
                    }
                } catch (updateError: any) {
                    console.error('Error updating subscription:', updateError);
                    setError(`Error: ${updateError?.message || 'No se pudo procesar el pago'}`);
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-editor-panel-bg rounded-2xl border border-editor-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-editor-border/50 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-editor-text-secondary" />
                </button>

                {/* Header */}
                <div className="p-6 pb-4 border-b border-editor-border bg-gradient-to-r from-editor-accent/10 to-purple-500/10">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-editor-accent/20">
                            <TriggerIcon className="w-8 h-8 text-editor-accent" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-editor-text-primary mb-1">
                                {t(`dashboard.upgradeModal.triggers.${trigger}.title`)}
                            </h2>
                            <p className="text-editor-text-secondary">
                                {t(`dashboard.upgradeModal.triggers.${trigger}.subtitle`)}
                            </p>
                            
                            {/* Show credits info if trigger is credits */}
                            {trigger === 'credits' && metadata?.creditsRemaining !== undefined && (
                                <div className="mt-3 flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        {t('dashboard.upgradeModal.creditsRemaining', { 
                                            remaining: metadata.creditsRemaining, 
                                            total: metadata.creditsTotal 
                                        })}
                                    </span>
                                </div>
                            )}
                            
                            {/* Show projects info if trigger is projects */}
                            {trigger === 'projects' && metadata?.currentProjects !== undefined && (
                                <div className="mt-3 flex items-center gap-2 text-amber-400">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        {t('dashboard.upgradeModal.projectsUsed', { 
                                            current: metadata.currentProjects, 
                                            max: metadata.maxProjects 
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Billing toggle */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                billingCycle === 'monthly'
                                    ? 'bg-editor-accent text-white'
                                    : 'bg-editor-border/50 text-editor-text-secondary hover:text-editor-text-primary'
                            }`}
                        >
                            {t('dashboard.upgradeModal.billing.monthly')}
                        </button>
                        <button
                            onClick={() => setBillingCycle('annually')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                billingCycle === 'annually'
                                    ? 'bg-editor-accent text-white'
                                    : 'bg-editor-border/50 text-editor-text-secondary hover:text-editor-text-primary'
                            }`}
                        >
                            {t('dashboard.upgradeModal.billing.annually')}
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                {t('dashboard.upgradeModal.billing.discount')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-editor-accent/30 border-t-editor-accent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {upgradePlans.map((plan) => {
                                const PlanIcon = PLAN_ICONS[plan.id] || Sparkles;
                                const isRecommended = plan.id === recommendedPlanId;
                                const isSelected = selectedPlanId === plan.id;
                                const originalPlan = SUBSCRIPTION_PLANS[plan.id as SubscriptionPlanId];
                                const annualPrice = originalPlan?.price.annually || plan.priceValue * 0.8;
                                const displayPrice = billingCycle === 'annually' ? annualPrice : plan.priceValue;
                                const savings = Math.round((1 - annualPrice / plan.priceValue) * 100);

                                return (
                                    <div
                                        key={plan.id}
                                        onClick={() => handleSelectPlan(plan.id)}
                                        className={`
                                            relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                                            ${isSelected 
                                                ? 'border-editor-accent bg-editor-accent/10 scale-[1.02]' 
                                                : isRecommended
                                                    ? 'border-editor-accent/50 bg-editor-accent/5'
                                                    : 'border-editor-border hover:border-editor-accent/30'
                                            }
                                        `}
                                    >
                                        {/* Recommended badge */}
                                        {isRecommended && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                <span className="px-3 py-1 bg-gradient-to-r from-editor-accent to-purple-500 text-white text-xs font-bold rounded-full whitespace-nowrap animate-pulse">
                                                    {t('dashboard.upgradeModal.recommended')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Plan header */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div 
                                                className="p-2 rounded-lg"
                                                style={{ backgroundColor: `${plan.color}20` }}
                                            >
                                                <PlanIcon 
                                                    className="w-5 h-5" 
                                                    style={{ color: plan.color }}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-editor-text-primary">
                                                    {plan.name}
                                                </h3>
                                                <p className="text-xs text-editor-text-secondary">
                                                    {plan.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold text-editor-text-primary">
                                                    ${displayPrice}
                                                </span>
                                                <span className="text-editor-text-secondary">
                                                    {t('dashboard.upgradeModal.billing.perMonth')}
                                                </span>
                                            </div>
                                            {billingCycle === 'annually' && savings > 0 && (
                                                <p className="text-xs text-green-400 mt-1">
                                                    {t('dashboard.upgradeModal.billing.savePercent', { percent: savings })}
                                                </p>
                                            )}
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-2">
                                            {plan.features.slice(0, 5).map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                    <Check 
                                                        className="w-4 h-4 mt-0.5 flex-shrink-0" 
                                                        style={{ color: plan.color }}
                                                    />
                                                    <span className="text-editor-text-secondary">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <div className="absolute top-3 right-3">
                                                <div className="w-6 h-6 rounded-full bg-editor-accent flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-editor-border bg-editor-bg/50">
                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-editor-text-secondary">
                            <Gift className="w-4 h-4" />
                            <span className="text-sm">
                                {t('dashboard.upgradeModal.footer.cancelAnytime')}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-lg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/50 transition-colors disabled:opacity-50"
                            >
                                {t('dashboard.upgradeModal.footer.later')}
                            </button>
                            <button
                                onClick={handleUpgrade}
                                disabled={!selectedPlanId || isProcessing}
                                className={`
                                    px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all
                                    ${selectedPlanId && !isProcessing
                                        ? 'bg-gradient-to-r from-editor-accent to-purple-500 text-white hover:opacity-90 shadow-lg shadow-editor-accent/25'
                                        : 'bg-editor-border text-editor-text-secondary cursor-not-allowed'
                                    }
                                `}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        {t('dashboard.upgradeModal.footer.upgradeNow')}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
