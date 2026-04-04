/**
 * SubscriptionSettings
 * Modern subscription UI with hero plan card, animated usage bar, and plan comparison
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Crown,
    Sparkles,
    Check,
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
    Star,
    ArrowRight,
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

// Plan gradient accents
const PLAN_GRADIENTS: Record<string, string> = {
    free: 'from-gray-400 to-gray-500',
    individual: 'from-pink-500 to-rose-500',
    agency_starter: 'from-blue-500 to-cyan-500',
    agency_pro: 'from-violet-500 to-purple-500',
    agency_scale: 'from-amber-500 to-yellow-500',
    enterprise: 'from-amber-500 to-yellow-500',
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
    const tenantContext = useTenant();
    const { currentTenant, isLoadingTenant } = tenantContext;
    const { usage, isLoading: isLoadingUsage, refresh } = useCreditsUsage();
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
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

        if (isSuccess) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            const refreshAfterCheckout = async () => {
                await new Promise(resolve => setTimeout(resolve, 2000));
                refresh();
                setTimeout(() => refresh(), 5000);
                setTimeout(() => refresh(), 10000);
            };

            refreshAfterCheckout();
        }
    }, [refresh]);

    // Get current plan from usage or default to free
    const currentPlanId: SubscriptionPlanId = usage?.planId || 'free';
    const currentPlan = getPlan(currentPlanId) || SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.free;
    const IconComponent = PLAN_ICONS[currentPlanId] || Sparkles;
    const PlanIcon = IconComponent || (() => <div className="w-7 h-7 bg-muted rounded-full" />);
    const currentGradient = PLAN_GRADIENTS[currentPlanId] || PLAN_GRADIENTS.free;

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

    const handleSelectPlan = async (planId: SubscriptionPlanId, billingCycle: 'monthly' | 'annually' = 'monthly') => {
        let tenantId = currentTenant?.id;

        if (!tenantId && user?.uid) {
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

            if (currentPlanId !== 'free') {
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
                        if (result.data.proration && result.data.proration.amount !== 0) {
                            alert(result.data.proration.description);
                        }
                        refresh();
                        return;
                    }
                } catch (updateError: any) {
                    if (!updateError.message?.includes('No active Stripe subscription')) {
                        throw updateError;
                    }
                }
            }

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

    const allPlans = plansArray;
    const currentPlanIndex = allPlans.findIndex(p => p.id === currentPlanId);

    // Determine "recommended" plan: next tier above current
    const recommendedPlanId = currentPlanIndex < allPlans.length - 1
        ? allPlans[currentPlanIndex + 1]?.id
        : null;

    const usagePercentage = usage?.percentage || 0;

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════ */}
            {/* HERO: Current Plan + Usage                     */}
            {/* ═══════════════════════════════════════════════ */}
            <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
                {/* Gradient accent strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${currentGradient}`} />

                <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                        {/* Plan info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg`}>
                                    <PlanIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-foreground">
                                            {currentPlan.name}
                                        </h2>
                                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r ${currentGradient} text-white`}>
                                            {t('settings.subscription.activePlan', 'Activo')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {currentPlan.description}
                                    </p>
                                </div>
                            </div>

                            {/* Plan features mini grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                                    <Sparkles size={14} className="text-primary mb-1" />
                                    <p className="text-lg font-bold text-foreground">{currentPlan.limits.maxAiCredits.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        {t('settings.subscription.aiCredits', 'Créditos IA')}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                                    <Rocket size={14} className="text-primary mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                        {currentPlan.limits.maxProjects === -1 ? '∞' : currentPlan.limits.maxProjects}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        {t('settings.subscription.projects', 'Proyectos')}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                                    <Gift size={14} className="text-primary mb-1" />
                                    <p className="text-lg font-bold text-foreground">{currentPlan.limits.maxStorageGB} GB</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        {t('settings.subscription.storage', 'Almacenamiento')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Usage card */}
                        <div className="lg:w-80 bg-background rounded-2xl border border-border p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Zap size={14} className="text-amber-500" />
                                    {t('settings.subscription.usageStatus', 'Uso de Créditos')}
                                </h4>
                                <button
                                    onClick={handleRefresh}
                                    disabled={isLoadingUsage}
                                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {isLoadingUsage ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-3 bg-secondary rounded-full" />
                                    <div className="h-4 bg-secondary rounded w-1/3" />
                                </div>
                            ) : (
                                <>
                                    {/* Animated progress bar with gradient */}
                                    <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-3">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${usagePercentage}%`,
                                                background: usagePercentage > 90
                                                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                                    : usagePercentage > 70
                                                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                                        : `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                                            }}
                                        />
                                        {/* Shimmer effect */}
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full opacity-30"
                                            style={{
                                                width: `${usagePercentage}%`,
                                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                                                animation: 'shimmer 2s infinite',
                                            }}
                                        />
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex items-center justify-between text-xs mb-3">
                                        <span className="text-muted-foreground">
                                            {t('settings.subscription.used', 'Usado')}: <span className="font-semibold text-foreground">{usage?.used || 0}</span>
                                        </span>
                                        <span className="text-muted-foreground">
                                            {t('settings.subscription.limit', 'Límite')}: <span className="font-semibold text-foreground">{usage?.limit || 0}</span>
                                        </span>
                                    </div>

                                    {/* Remaining highlight */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
                                        <span className="text-sm text-muted-foreground">
                                            {t('settings.subscription.remaining', 'Restante')}
                                        </span>
                                        <span
                                            className="text-lg font-bold"
                                            style={{ color: usage?.color || 'hsl(var(--primary))' }}
                                        >
                                            {usage?.remaining || 0}
                                        </span>
                                    </div>

                                    {/* Warnings */}
                                    {(usage?.isNearLimit || usage?.hasExceededLimit) && !isUserOwner && (
                                        <div className={`mt-3 p-3 rounded-xl border flex items-start gap-2 ${usage?.hasExceededLimit
                                            ? 'bg-red-500/5 border-red-500/20'
                                            : 'bg-amber-500/5 border-amber-500/20'
                                            }`}>
                                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${usage?.hasExceededLimit ? 'text-red-500' : 'text-amber-500'
                                                }`} />
                                            <div className="flex-1">
                                                <p className={`text-xs font-semibold ${usage?.hasExceededLimit
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
                                                        className="mt-2 w-full py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* PLANS COMPARISON                               */}
            {/* ═══════════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                        {t('settings.subscription.availablePlans', 'Planes Disponibles')}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allPlans.map((plan) => {
                        const PlanIconComp = PLAN_ICONS[plan.id] || Sparkles;
                        const Icon = PlanIconComp || (() => <div className="w-5 h-5 bg-muted rounded-full" />);
                        const isCurrentPlan = plan.id === currentPlanId;
                        const isUpgrade = allPlans.findIndex(p => p.id === plan.id) > currentPlanIndex;
                        const isRecommended = plan.id === recommendedPlanId;
                        const isLoading = loadingPlanId === plan.id;
                        const gradient = PLAN_GRADIENTS[plan.id] || PLAN_GRADIENTS.free;

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isCurrentPlan
                                    ? 'bg-primary/5 border-primary/50 shadow-md shadow-primary/10'
                                    : isRecommended
                                        ? 'bg-card border-amber-500/50 shadow-md shadow-amber-500/10'
                                        : 'bg-card border-border hover:border-primary/30'
                                    }`}
                            >
                                {/* Recommended badge */}
                                {isRecommended && !isCurrentPlan && (
                                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10 -translate-y-1/2">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full shadow-lg">
                                            <Star size={11} />
                                            {t('settings.subscription.recommended', 'Recomendado')}
                                        </span>
                                    </div>
                                )}

                                {/* Gradient top strip */}
                                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                                <div className="p-5 flex flex-col flex-1">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg`}
                                            >
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-foreground">{plan.name}</h4>
                                                {isCurrentPlan && (
                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                                        {t('settings.subscription.current', 'Actual')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="mb-4">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-extrabold text-foreground">${plan.price.monthly}</span>
                                            <span className="text-sm text-muted-foreground">/mes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
                                            {plan.description}
                                        </p>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2.5 mb-6 flex-grow">
                                        <li className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Sparkles className="w-3 h-3 text-primary" />
                                            </div>
                                            <span>
                                                <strong className="text-foreground">{plan.limits.maxAiCredits.toLocaleString()}</strong> créditos IA
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Rocket className="w-3 h-3 text-primary" />
                                            </div>
                                            <span>
                                                <strong className="text-foreground">
                                                    {plan.limits.maxProjects === -1 ? 'Ilimitados' : plan.limits.maxProjects}
                                                </strong> proyectos
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Gift className="w-3 h-3 text-primary" />
                                            </div>
                                            <span>
                                                <strong className="text-foreground">{plan.limits.maxStorageGB} GB</strong> almacenamiento
                                            </span>
                                        </li>
                                    </ul>

                                    {/* Action Button */}
                                    {isCurrentPlan ? (
                                        <button
                                            disabled
                                            className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center gap-2 cursor-default"
                                        >
                                            <Check className="w-4 h-4" />
                                            {t('settings.subscription.currentPlan', 'Plan Actual')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={isLoading || loadingPlanId !== null}
                                            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isUpgrade
                                                ? `bg-gradient-to-r ${gradient} text-white hover:shadow-lg hover:shadow-primary/25`
                                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                }`}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    {t('common.processing', 'Procesando...')}
                                                </>
                                            ) : isUpgrade ? (
                                                <>
                                                    {t('settings.subscription.upgrade', 'Mejorar Plan')}
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            ) : (
                                                <>
                                                    {t('settings.subscription.changePlan', 'Cambiar Plan')}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* BILLING & MANAGEMENT                           */}
            {/* ═══════════════════════════════════════════════ */}
            {currentPlanId !== 'free' && subscriptionDetails?.stripe && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <div className="p-5 border-b border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">
                                {t('settings.subscription.billingPeriod', 'Período de Facturación')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {t('settings.subscription.billingDesc', 'Detalles de tu ciclo de facturación actual')}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Timeline */}
                        <div className="relative">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                                    <span className="text-xs text-muted-foreground block mb-1">
                                        {t('settings.subscription.periodStart', 'Inicio del período')}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {new Date(subscriptionDetails.stripe.currentPeriodStart).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                                    <span className="text-xs text-muted-foreground block mb-1">
                                        {t('settings.subscription.periodEnd', 'Próxima renovación')}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {new Date(subscriptionDetails.stripe.currentPeriodEnd).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Timeline bar between dates */}
                            {(() => {
                                const start = new Date(subscriptionDetails.stripe!.currentPeriodStart).getTime();
                                const end = new Date(subscriptionDetails.stripe!.currentPeriodEnd).getTime();
                                const now = Date.now();
                                const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                                return (
                                    <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${currentGradient} transition-all duration-500`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Cancellation Warning */}
                        {subscriptionDetails.stripe.cancelAtPeriodEnd && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
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
                                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {isReactivating ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RotateCcw className="w-3.5 h-3.5" />
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
                                    className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                            <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
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

            {/* Shimmer animation style */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
};

export default SubscriptionSettings;
