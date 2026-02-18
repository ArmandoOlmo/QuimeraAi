/**
 * SubscriptionSettings
 * Component to display current subscription plan and allow upgrades
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Crown,
    Sparkles,
    Check,
    ArrowRight,
    Zap,
    Rocket,
    Building2,
    AlertTriangle,
    Gift,
    TrendingUp,
    RefreshCw,
    Loader2,
    Calendar,
    XCircle,
    RotateCcw,
    Heart,
    ChevronDown,
    ChevronUp,
    Info,
} from 'lucide-react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { usePlans } from '../../../contexts/PlansContext';
import { useSafeUpgrade } from '../../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../../hooks/useCreditsUsage';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useTenant } from '../../../contexts/tenant';
import { httpsCallable, getFunctionsInstance } from '../../../firebase';
import {
    SUBSCRIPTION_PLANS,
    SubscriptionPlanId,
} from '../../../types/subscription';

// Plan icons mapping
const PLAN_ICONS: Record<SubscriptionPlanId, React.ElementType> = {
    free: Sparkles,
    individual: Heart,
    agency_starter: Building2,
    agency_pro: Zap,
    agency_scale: Crown,
    enterprise: Crown,
};

interface SubscriptionDetails {
    stripe?: {
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        cancelAt: string | null;
        status: string;
    };
    cancelAtPeriodEnd?: boolean;
}

const SubscriptionSettings: React.FC = () => {
    const { t } = useTranslation();
    const { isUserOwner, user } = useAuth();
    const { plansArray, getPlan } = usePlans();
    const upgradeContext = useSafeUpgrade();
    // Use useTenant to get the full context - we're in the dashboard where TenantProvider is always available
    const tenantContext = useTenant();
    const { currentTenant, isLoadingTenant } = tenantContext;
    const { usage, isLoading: isLoadingUsage, refresh } = useCreditsUsage();
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [instructionsCollapsed, setInstructionsCollapsed] = useState(true);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [pendingCancelImmediately, setPendingCancelImmediately] = useState(false);

    // Fetch subscription details on mount
    useEffect(() => {
        const fetchSubscriptionDetails = async () => {
            if (!currentTenant?.id) return;

            try {
                const functions = await getFunctionsInstance();
                const getDetails = httpsCallable<
                    { tenantId: string },
                    { subscription: SubscriptionDetails; invoices: any[] }
                >(functions, 'getSubscriptionDetails');

                const result = await getDetails({ tenantId: currentTenant.id });
                setSubscriptionDetails(result.data.subscription);
            } catch (error) {
                console.error('Error fetching subscription details:', error);
            }
        };

        fetchSubscriptionDetails();
    }, [currentTenant?.id]);

    // Handle success redirect from Stripe checkout
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const isSuccess = urlParams.get('success') === 'true';
        const planParam = urlParams.get('plan');

        if (isSuccess) {
            // Clean URL params
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            // Force refresh data after successful checkout
            const refreshAfterCheckout = async () => {
                // Wait a moment for webhook to process
                await new Promise(resolve => setTimeout(resolve, 2000));
                refresh();

                // Retry refresh after more time in case webhook is slow
                setTimeout(() => refresh(), 5000);
                setTimeout(() => refresh(), 10000);
            };

            refreshAfterCheckout();
        }
    }, [refresh]);

    // Get current plan from usage or default to free
    const currentPlanId: SubscriptionPlanId = usage?.planId || 'free';
    // Try to get from context first, otherwise fallback to hardcoded
    const currentPlan = getPlan(currentPlanId) || SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.free;
    const IconComponent = PLAN_ICONS[currentPlanId] || Sparkles;
    // Safety check to ensure we always have a valid component
    const PlanIcon = IconComponent || (() => <div className="w-7 h-7 bg-muted rounded-full" />);

    const handleUpgradeClick = (trigger: 'generic' | 'credits' = 'generic') => {
        if (upgradeContext) {
            if (trigger === 'credits' && usage) {
                upgradeContext.showCreditsUpgrade(usage.remaining, usage.limit);
            } else {
                upgradeContext.openUpgradeModal('generic');
            }
        }
    };

    const handleRefresh = () => {
        refresh();
    };

    /**
     * Handle plan selection - upgrade/downgrade or new checkout
     */
    const handleSelectPlan = async (planId: SubscriptionPlanId, billingCycle: 'monthly' | 'annually' = 'monthly') => {
        // Use currentTenant.id if available, otherwise construct from userId
        let tenantId = currentTenant?.id;

        if (!tenantId && user?.uid) {
            // Fallback: construct tenantId from userId using the standard pattern
            tenantId = `tenant_${user.uid}`;
        }

        if (!tenantId) {
            setCheckoutError(t('settings.subscription.noTenantError', 'No workspace found. Please refresh the page and try again.'));
            return;
        }

        setLoadingPlanId(planId);
        setCheckoutError(null);

        try {
            const functions = await getFunctionsInstance();

            // If user already has a paid subscription, try to update it
            if (currentPlanId !== 'free') {
                console.log('[SubscriptionSettings] User has paid plan, trying to update subscription...');
                // Try to update existing subscription
                const updateSub = httpsCallable<
                    { tenantId: string; newPlanId: string; billingCycle?: string },
                    { success: boolean; subscription?: any; proration?: any; error?: string }
                >(functions, 'updateSubscription');

                try {
                    console.log('[SubscriptionSettings] Calling updateSubscription...');
                    const result = await updateSub({
                        tenantId,
                        newPlanId: planId,
                        billingCycle,
                    });

                    if (result.data.success) {
                        // Show proration info if any
                        if (result.data.proration && result.data.proration.amount !== 0) {
                            alert(result.data.proration.description);
                        }
                        // Refresh to show updated plan
                        refresh();
                        return;
                    }
                } catch (updateError: any) {
                    // If update fails because no Stripe subscription exists, fall through to checkout
                    if (!updateError.message?.includes('No active Stripe subscription')) {
                        throw updateError;
                    }
                }
            }

            // Create new checkout session (for free users or if update failed)
            const createCheckout = httpsCallable<
                { tenantId: string; planId: string; billingCycle: string; successUrl: string; cancelUrl: string },
                { sessionId: string; url: string }
            >(functions, 'createSubscriptionCheckout');

            const checkoutParams = {
                tenantId,
                planId,
                billingCycle,
                successUrl: `${window.location.origin}/settings/subscription?success=true&plan=${planId}`,
                cancelUrl: `${window.location.origin}/settings/subscription?cancelled=true`,
            };

            const result = await createCheckout(checkoutParams);

            // Redirect to Stripe Checkout
            if (result.data.url) {
                window.location.href = result.data.url;
            } else {
                console.error('Failed to get checkout URL');
                setCheckoutError(t('settings.subscription.checkoutError', 'Failed to create checkout session'));
            }
        } catch (error: any) {
            console.error('Error changing plan:', error);
            setCheckoutError(error.message || t('settings.subscription.checkoutError', 'Failed to change plan'));
        } finally {
            setLoadingPlanId(null);
        }
    };

    /**
     * Handle subscription cancellation
     */
    const handleCancelSubscription = (immediately: boolean = false) => {
        if (!currentTenant?.id) return;
        setPendingCancelImmediately(immediately);
        setCancelConfirmOpen(true);
    };

    const confirmCancelSubscription = async () => {
        if (!currentTenant?.id) return;
        setCancelConfirmOpen(false);
        const immediately = pendingCancelImmediately;

        setIsCancelling(true);
        try {
            const functions = await getFunctionsInstance();
            const cancelSub = httpsCallable<
                { tenantId: string; immediately?: boolean },
                { success: boolean; message: string; cancelsAt?: string }
            >(functions, 'cancelSubscription');

            const result = await cancelSub({
                tenantId: currentTenant.id,
                immediately,
            });

            alert(result.data.message);
            refresh();

            // Refresh subscription details
            const getDetails = httpsCallable<
                { tenantId: string },
                { subscription: SubscriptionDetails; invoices: any[] }
            >(functions, 'getSubscriptionDetails');
            const details = await getDetails({ tenantId: currentTenant.id });
            setSubscriptionDetails(details.data.subscription);

        } catch (error: any) {
            console.error('Error cancelling subscription:', error);
            alert(error.message || 'Error al cancelar la suscripción');
        } finally {
            setIsCancelling(false);
        }
    };

    /**
     * Handle subscription reactivation
     */
    const handleReactivateSubscription = async () => {
        if (!currentTenant?.id) return;

        setIsReactivating(true);
        try {
            const functions = await getFunctionsInstance();
            const reactivateSub = httpsCallable<
                { tenantId: string },
                { success: boolean; message: string }
            >(functions, 'reactivateSubscription');

            const result = await reactivateSub({ tenantId: currentTenant.id });
            alert(result.data.message);
            refresh();

            // Refresh subscription details
            const getDetails = httpsCallable<
                { tenantId: string },
                { subscription: SubscriptionDetails; invoices: any[] }
            >(functions, 'getSubscriptionDetails');
            const details = await getDetails({ tenantId: currentTenant.id });
            setSubscriptionDetails(details.data.subscription);

        } catch (error: any) {
            console.error('Error reactivating subscription:', error);
            alert(error.message || 'Error al reactivar la suscripción');
        } finally {
            setIsReactivating(false);
        }
    };

    // Get list of plans for comparison
    const allPlans = plansArray;
    const currentPlanIndex = allPlans.findIndex(p => p.id === currentPlanId);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                    {t('settings.subscription.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t('settings.subscription.description')}
                </p>
            </div>

            {/* Top Grid: Instructions & Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Collapsible Instructions */}
                <div className="lg:col-span-2 bg-blue-500/10 border border-blue-500/30 rounded-xl overflow-hidden self-start">
                    <button
                        onClick={() => setInstructionsCollapsed(!instructionsCollapsed)}
                        className="w-full p-4 flex items-center justify-between hover:bg-blue-500/5 transition-colors"
                    >
                        <h4 className="font-semibold text-blue-500 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            {t('settings.subscription.howItWorks', '¿Cómo funciona tu plan?')}
                        </h4>
                        {instructionsCollapsed ? (
                            <ChevronDown className="w-5 h-5 text-blue-500" />
                        ) : (
                            <ChevronUp className="w-5 h-5 text-blue-500" />
                        )}
                    </button>
                    {!instructionsCollapsed && (
                        <div className="px-4 pb-4 space-y-3">
                            <ul className="list-none space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-foreground">{t('settings.subscription.aiCredits')}:</strong> {t('settings.subscription.aiCreditsDesc', 'Se renuevan cada mes. Úsalos para generar contenido, imágenes y más con IA.')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Rocket className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-foreground">{t('settings.subscription.projects')}:</strong> {t('settings.subscription.projectsDesc', 'Número de sitios web que puedes crear y publicar.')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Gift className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-foreground">{t('settings.subscription.storage')}:</strong> {t('settings.subscription.storageDesc', 'Espacio para guardar imágenes, videos y archivos.')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Crown className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-foreground">Upgrade:</strong> {t('settings.subscription.upgradeDesc', 'Mejora tu plan para desbloquear más recursos y funcionalidades premium.')}</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Current Usage Details - Compact Card */}
                <div className="bg-card rounded-xl border border-border overflow-hidden self-start">
                    <div className="p-3 border-b border-border bg-secondary/10 flex items-center justify-between">
                        <h4 className="font-medium text-foreground text-sm flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            {t('settings.subscription.usageStatus', 'Estado de Uso')}
                        </h4>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoadingUsage}
                            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="p-4">
                        {isLoadingUsage ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-2 bg-secondary rounded-full" />
                                <div className="h-3 bg-secondary rounded w-1/3" />
                            </div>
                        ) : (
                            <>
                                {/* Progress Bar */}
                                <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${usage?.percentage || 0}%`,
                                            backgroundColor: usage?.color || 'hsl(var(--primary))',
                                        }}
                                    />
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between text-xs mb-3">
                                    <span className="text-muted-foreground">
                                        {t('settings.subscription.used')}: <span className="font-medium text-foreground">{usage?.used || 0}</span>
                                    </span>
                                    <span className="text-muted-foreground">
                                        {t('settings.subscription.limit')}: <span className="font-medium text-foreground">{usage?.limit || 0}</span>
                                    </span>
                                </div>

                                {/* Remaining */}
                                <div className="p-2 rounded-lg bg-secondary/50 flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        {t('settings.subscription.remaining')}
                                    </span>
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: usage?.color || 'hsl(var(--primary))' }}
                                    >
                                        {usage?.remaining || 0}
                                    </span>
                                </div>

                                {/* Warnings (Compact) */}
                                {(usage?.isNearLimit || usage?.hasExceededLimit) && !isUserOwner && (
                                    <div className={`mt-3 p-2 rounded-lg border flex items-start gap-2 ${usage?.hasExceededLimit
                                        ? 'bg-red-500/5 border-red-500/10'
                                        : 'bg-amber-500/5 border-amber-500/10'
                                        }`}>
                                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${usage?.hasExceededLimit ? 'text-red-500' : 'text-amber-500'
                                            }`} />
                                        <div className="flex-1">
                                            <p className={`text-xs font-medium ${usage?.hasExceededLimit
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                                }`}>
                                                {usage?.hasExceededLimit
                                                    ? t('settings.subscription.exceededLimit')
                                                    : t('settings.subscription.nearLimit')
                                                }
                                            </p>
                                            {usage?.hasExceededLimit && (
                                                <button
                                                    onClick={() => handleUpgradeClick('credits')}
                                                    className="mt-1.5 w-full py-1 text-[10px] font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                                >
                                                    {t('settings.subscription.upgradeNow')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* =============================================== */}
            {/* COMPREHENSIVE PLANS COMPARISON */}
            {/* =============================================== */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            {t('settings.subscription.availablePlans', 'Planes Disponibles')}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allPlans.map((plan) => {
                        const IconComponent = PLAN_ICONS[plan.id] || Sparkles;
                        const Icon = IconComponent || (() => <div className="w-5 h-5 bg-muted rounded-full" />);
                        const isCurrentPlan = plan.id === currentPlanId;
                        const isUpgrade = allPlans.findIndex(p => p.id === plan.id) > currentPlanIndex;
                        const isLoading = loadingPlanId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`flex flex-col p-5 rounded-xl border transition-all duration-200 ${isCurrentPlan
                                    ? 'bg-primary/5 border-primary shadow-sm'
                                    : 'bg-card border-border hover:border-primary/50 hover:shadow-sm'
                                    }`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${plan.color}15` }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: plan.color }} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">{plan.name}</h4>
                                            {isCurrentPlan && (
                                                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                                    Actual
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-foreground">${plan.price.monthly}</span>
                                        <span className="text-sm text-muted-foreground">/mes</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Features */}
                                <ul className="space-y-2 mb-6 flex-grow">
                                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                        <span>
                                            <strong className="text-foreground">{plan.limits.maxAiCredits.toLocaleString()}</strong> créditos IA
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Rocket className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                        <span>
                                            <strong className="text-foreground">
                                                {plan.limits.maxProjects === -1 ? 'Ilimitados' : plan.limits.maxProjects}
                                            </strong> proyectos
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Gift className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                        <span>
                                            <strong className="text-foreground">{plan.limits.maxStorageGB} GB</strong> almacenamiento
                                        </span>
                                    </li>
                                </ul>

                                {/* Action Button */}
                                {isCurrentPlan ? (
                                    <button
                                        disabled
                                        className="w-full py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-2 cursor-default"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Plan Actual
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('[SubscriptionSettings] Button clicked for plan:', plan.id);
                                            handleSelectPlan(plan.id);
                                        }}
                                        disabled={isLoading || loadingPlanId !== null}
                                        className={`w-full py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${isUpgrade
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                            }`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Procesando...
                                            </>
                                        ) : isUpgrade ? (
                                            <>
                                                Mejorar Plan
                                                <TrendingUp className="w-3.5 h-3.5" />
                                            </>
                                        ) : (
                                            <>
                                                Cambiar Plan
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>



            {/* Billing Period & Subscription Management (for paid plans) */}
            {currentPlanId !== 'free' && subscriptionDetails?.stripe && (
                <div className="bg-card rounded-xl border border-border p-6">
                    <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {t('settings.subscription.billingPeriod', 'Período de Facturación')}
                    </h4>

                    <div className="space-y-4">
                        {/* Billing Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-secondary/30">
                                <span className="text-xs text-muted-foreground block mb-1">
                                    {t('settings.subscription.periodStart', 'Inicio del período')}
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {new Date(subscriptionDetails.stripe.currentPeriodStart).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/30">
                                <span className="text-xs text-muted-foreground block mb-1">
                                    {t('settings.subscription.periodEnd', 'Próxima renovación')}
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {new Date(subscriptionDetails.stripe.currentPeriodEnd).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Cancellation Warning */}
                        {subscriptionDetails.stripe.cancelAtPeriodEnd && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm text-amber-600 dark:text-amber-400">
                                            {t('settings.subscription.willCancel', 'Tu suscripción se cancelará el')} {new Date(subscriptionDetails.stripe.currentPeriodEnd).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleReactivateSubscription}
                                        disabled={isReactivating}
                                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isReactivating ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <RotateCcw className="w-3 h-3" />
                                        )}
                                        {t('settings.subscription.reactivate', 'Reactivar')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Cancel Subscription Button */}
                        {!subscriptionDetails.stripe.cancelAtPeriodEnd && (
                            <div className="pt-4 border-t border-border">
                                <button
                                    onClick={() => handleCancelSubscription(false)}
                                    disabled={isCancelling}
                                    className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isCancelling ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    {t('settings.subscription.cancelSubscription', 'Cancelar suscripción')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Checkout Error */}
            {checkoutError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                {t('settings.subscription.checkoutErrorTitle', 'Error al procesar')}
                            </p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                                {checkoutError}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Subscription Confirmation Modal */}
            <ConfirmationModal
                isOpen={cancelConfirmOpen}
                onConfirm={confirmCancelSubscription}
                onCancel={() => setCancelConfirmOpen(false)}
                title={t('settings.subscription.cancelTitle', 'Cancelar Suscripción')}
                message={pendingCancelImmediately
                    ? t('settings.subscription.confirmCancelImmediately', '¿Estás seguro de que deseas cancelar inmediatamente? Perderás acceso a las funciones de tu plan actual.')
                    : t('settings.subscription.confirmCancel', '¿Estás seguro de que deseas cancelar? Tu suscripción permanecerá activa hasta el final del período actual.')
                }
                variant="danger"
            />
        </div>
    );
};

// Helper component for feature items
const FeatureItem: React.FC<{ label: string; value: string; included?: boolean }> = ({
    label,
    value,
    included
}) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-medium ${included === false
            ? 'text-muted-foreground/50'
            : included === true
                ? 'text-green-600 dark:text-green-400'
                : 'text-foreground'
            }`}>
            {value}
        </span>
    </div>
);

export default SubscriptionSettings;
