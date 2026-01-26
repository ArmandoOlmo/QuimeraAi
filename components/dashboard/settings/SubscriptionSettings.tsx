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
} from 'lucide-react';
import { usePlans } from '../../../contexts/PlansContext';
import { useSafeUpgrade } from '../../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../../hooks/useCreditsUsage';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useSafeTenant } from '../../../contexts/tenant';
import { httpsCallable, getFunctionsInstance } from '../../../firebase';
import {
    SUBSCRIPTION_PLANS,
    SubscriptionPlanId,
} from '../../../types/subscription';

// Plan icons mapping
const PLAN_ICONS: Record<SubscriptionPlanId, React.ElementType> = {
    free: Sparkles,
    hobby: Heart,
    starter: Rocket,
    pro: Zap,
    agency: Building2,
    agency_plus: Crown,
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
    const { isUserOwner } = useAuth();
    const { plansArray, getPlan } = usePlans();
    const upgradeContext = useSafeUpgrade();
    const tenantContext = useSafeTenant();
    const { usage, isLoading: isLoadingUsage, refresh } = useCreditsUsage();
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);

    // Fetch subscription details on mount
    useEffect(() => {
        const fetchSubscriptionDetails = async () => {
            if (!tenantContext?.currentTenant?.id) return;

            try {
                const functions = await getFunctionsInstance();
                const getDetails = httpsCallable<
                    { tenantId: string },
                    { subscription: SubscriptionDetails; invoices: any[] }
                >(functions, 'getSubscriptionDetails');

                const result = await getDetails({ tenantId: tenantContext.currentTenant.id });
                setSubscriptionDetails(result.data.subscription);
            } catch (error) {
                console.error('Error fetching subscription details:', error);
            }
        };

        fetchSubscriptionDetails();
    }, [tenantContext?.currentTenant?.id]);

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
        if (!tenantContext?.currentTenant?.id) {
            setCheckoutError(t('settings.subscription.noTenantError', 'No workspace found'));
            return;
        }

        setLoadingPlanId(planId);
        setCheckoutError(null);

        try {
            const functions = await getFunctionsInstance();
            const tenantId = tenantContext.currentTenant.id;

            // If user already has a paid subscription, try to update it
            if (currentPlanId !== 'free') {
                // Try to update existing subscription
                const updateSub = httpsCallable<
                    { tenantId: string; newPlanId: string; billingCycle?: string },
                    { success: boolean; subscription?: any; proration?: any; error?: string }
                >(functions, 'updateSubscription');

                try {
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
                    console.log('No existing Stripe subscription, creating new checkout');
                }
            }

            // Create new checkout session (for free users or if update failed)
            const createCheckout = httpsCallable<
                { tenantId: string; planId: string; billingCycle: string; successUrl: string; cancelUrl: string },
                { sessionId: string; url: string }
            >(functions, 'createSubscriptionCheckout');

            const result = await createCheckout({
                tenantId,
                planId,
                billingCycle,
                successUrl: `${window.location.origin}/settings/subscription?success=true&plan=${planId}`,
                cancelUrl: `${window.location.origin}/settings/subscription?cancelled=true`,
            });

            // Redirect to Stripe Checkout
            if (result.data.url) {
                window.location.href = result.data.url;
            } else {
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
    const handleCancelSubscription = async (immediately: boolean = false) => {
        if (!tenantContext?.currentTenant?.id) return;

        const confirmMessage = immediately
            ? t('settings.subscription.confirmCancelImmediately', '¿Estás seguro de que deseas cancelar inmediatamente? Perderás acceso a las funciones de tu plan actual.')
            : t('settings.subscription.confirmCancel', '¿Estás seguro de que deseas cancelar? Tu suscripción permanecerá activa hasta el final del período actual.');

        if (!window.confirm(confirmMessage)) return;

        setIsCancelling(true);
        try {
            const functions = await getFunctionsInstance();
            const cancelSub = httpsCallable<
                { tenantId: string; immediately?: boolean },
                { success: boolean; message: string; cancelsAt?: string }
            >(functions, 'cancelSubscription');

            const result = await cancelSub({
                tenantId: tenantContext.currentTenant.id,
                immediately,
            });

            alert(result.data.message);
            refresh();

            // Refresh subscription details
            const getDetails = httpsCallable<
                { tenantId: string },
                { subscription: SubscriptionDetails; invoices: any[] }
            >(functions, 'getSubscriptionDetails');
            const details = await getDetails({ tenantId: tenantContext.currentTenant.id });
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
        if (!tenantContext?.currentTenant?.id) return;

        setIsReactivating(true);
        try {
            const functions = await getFunctionsInstance();
            const reactivateSub = httpsCallable<
                { tenantId: string },
                { success: boolean; message: string }
            >(functions, 'reactivateSubscription');

            const result = await reactivateSub({ tenantId: tenantContext.currentTenant.id });
            alert(result.data.message);
            refresh();

            // Refresh subscription details
            const getDetails = httpsCallable<
                { tenantId: string },
                { subscription: SubscriptionDetails; invoices: any[] }
            >(functions, 'getSubscriptionDetails');
            const details = await getDetails({ tenantId: tenantContext.currentTenant.id });
            setSubscriptionDetails(details.data.subscription);

        } catch (error: any) {
            console.error('Error reactivating subscription:', error);
            alert(error.message || 'Error al reactivar la suscripción');
        } finally {
            setIsReactivating(false);
        }
    };

    // Get list of plans for comparison
    // Use plansArray from context which excludes archived plans
    const allPlans = plansArray;
    const currentPlanIndex = allPlans.findIndex(p => p.id === currentPlanId);
    // If current plan is not in list (e.g. archived), show all plans as upgrades?
    // Or maybe show all plans that are higher in standard order?
    // If currentPlanIndex is -1 (archived), all active plans are potential upgrades.
    // If currentPlanIndex is valid, show higher plans.
    const upgradePlans = allPlans.filter((_, index) => index > currentPlanIndex);
    const downgradePlans = allPlans.filter((_, index) => index < currentPlanIndex && index > 0); // Exclude free from downgrade options

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

            {/* Current Plan Card */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Plan Header */}
                <div
                    className="p-6 border-b border-border"
                    style={{ background: `linear-gradient(135deg, ${currentPlan.color}15 0%, transparent 100%)` }}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${currentPlan.color}20` }}
                            >
                                <PlanIcon className="w-7 h-7" style={{ color: currentPlan.color }} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-foreground">
                                        {currentPlan.name}
                                    </h3>
                                    <span
                                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: `${currentPlan.color}20`,
                                            color: currentPlan.color
                                        }}
                                    >
                                        {t('settings.subscription.currentPlan')}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {currentPlan.description}
                                </p>
                            </div>
                        </div>

                        {currentPlanId !== 'enterprise' && !isUserOwner && (
                            <button
                                onClick={() => handleUpgradeClick('generic')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                            >
                                <Crown className="w-4 h-4" />
                                {t('settings.subscription.upgrade')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            {t('settings.subscription.aiCredits')}
                        </h4>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoadingUsage}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {isLoadingUsage ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-3 bg-secondary rounded-full" />
                            <div className="h-4 bg-secondary rounded w-1/3" />
                        </div>
                    ) : (
                        <>
                            {/* Progress Bar */}
                            <div className="h-3 bg-secondary rounded-full overflow-hidden mb-3">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${usage?.percentage || 0}%`,
                                        backgroundColor: usage?.color || 'hsl(var(--primary))',
                                    }}
                                />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {t('settings.subscription.used')}: <span className="font-medium text-foreground">{usage?.used || 0}</span>
                                </span>
                                <span className="text-muted-foreground">
                                    {t('settings.subscription.limit')}: <span className="font-medium text-foreground">{usage?.limit || 0}</span>
                                </span>
                            </div>

                            {/* Remaining */}
                            <div className="mt-4 p-3 rounded-lg bg-secondary/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {t('settings.subscription.remaining')}
                                    </span>
                                    <span
                                        className="text-lg font-bold"
                                        style={{ color: usage?.color || 'hsl(var(--primary))' }}
                                    >
                                        {usage?.remaining || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Warning if near limit */}
                            {usage?.isNearLimit && !isUserOwner && (
                                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                                {t('settings.subscription.nearLimit')}
                                            </p>
                                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                                                {t('settings.subscription.nearLimitDesc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Warning if exceeded */}
                            {usage?.hasExceededLimit && !isUserOwner && (
                                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                                {t('settings.subscription.exceededLimit')}
                                            </p>
                                            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                                                {t('settings.subscription.exceededLimitDesc')}
                                            </p>
                                            <button
                                                onClick={() => handleUpgradeClick('credits')}
                                                className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                                            >
                                                {t('settings.subscription.upgradeNow')}
                                                <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Plan Features */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    {t('settings.subscription.includedFeatures')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FeatureItem
                        label={t('settings.subscription.projects')}
                        value={currentPlan.limits.maxProjects === -1 ? t('common.unlimited', 'Unlimited') : currentPlan.limits.maxProjects.toString()}
                    />
                    <FeatureItem
                        label={t('settings.subscription.users')}
                        value={currentPlan.limits.maxUsers === -1 ? t('common.unlimited', 'Unlimited') : currentPlan.limits.maxUsers.toString()}
                    />
                    <FeatureItem
                        label={t('settings.subscription.storage')}
                        value={`${currentPlan.limits.maxStorageGB} GB`}
                    />
                    <FeatureItem
                        label={t('settings.subscription.domains')}
                        value={currentPlan.limits.maxDomains === -1 ? t('common.unlimited', 'Unlimited') : currentPlan.limits.maxDomains.toString()}
                    />
                    <FeatureItem
                        label={t('settings.subscription.aiCreditsMonth')}
                        value={currentPlan.limits.maxAiCredits.toLocaleString()}
                    />
                    <FeatureItem
                        label={t('settings.subscription.ecommerce')}
                        value={currentPlan.features.ecommerceEnabled ? t('settings.subscription.included') : t('settings.subscription.notIncluded')}
                        included={currentPlan.features.ecommerceEnabled}
                    />
                    <FeatureItem
                        label={t('settings.subscription.chatbot')}
                        value={currentPlan.features.chatbotEnabled ? t('settings.subscription.included') : t('settings.subscription.notIncluded')}
                        included={currentPlan.features.chatbotEnabled}
                    />
                    <FeatureItem
                        label={t('settings.subscription.customDomains')}
                        value={currentPlan.features.customDomains ? t('settings.subscription.included') : t('settings.subscription.notIncluded')}
                        included={currentPlan.features.customDomains}
                    />
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

            {/* Available Upgrades */}
            {upgradePlans.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                    <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        {t('settings.subscription.availableUpgrades')}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upgradePlans.slice(0, 3).map((plan) => {
                            const IconComponent = PLAN_ICONS[plan.id] || Sparkles;
                            const Icon = IconComponent || (() => <div className="w-5 h-5 bg-muted rounded-full" />);
                            const isLoading = loadingPlanId === plan.id;
                            return (
                                <div
                                    key={plan.id}
                                    className="p-4 rounded-xl border border-border hover:border-primary/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: `${plan.color}20` }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: plan.color }} />
                                        </div>
                                        <div>
                                            <h5 className="font-semibold text-foreground">{plan.name}</h5>
                                            <p className="text-xs text-muted-foreground">
                                                ${plan.price.monthly}/mes
                                            </p>
                                        </div>
                                    </div>

                                    <ul className="space-y-1.5">
                                        <li className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-green-500" />
                                            {plan.limits.maxAiCredits.toLocaleString()} AI credits
                                        </li>
                                        <li className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-green-500" />
                                            {plan.limits.maxProjects} {t('settings.subscription.projects')}
                                        </li>
                                        {plan.features.ecommerceEnabled && (
                                            <li className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Check className="w-3 h-3 text-green-500" />
                                                {t('dashboard.ecommerceIncluded')}
                                            </li>
                                        )}
                                    </ul>

                                    <button
                                        onClick={() => handleSelectPlan(plan.id)}
                                        disabled={isLoading || loadingPlanId !== null}
                                        className="mt-3 w-full py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t('common.processing', 'Procesando...')}
                                            </>
                                        ) : (
                                            <>
                                                {t('settings.subscription.selectPlan')}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
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




