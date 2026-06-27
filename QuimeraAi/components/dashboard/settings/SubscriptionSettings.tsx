/**
 * SubscriptionSettings
 * Modern subscription UI with hero plan card, animated usage bar, and plan comparison
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Crown,
    Sparkles,
    Check,
    Zap,
    Rocket,
    Building2,
    AlertTriangle,
    RefreshCw,
    Loader2,
    Calendar,
    XCircle,
    RotateCcw,
    Heart,
    Star,
    ArrowRight,
    CreditCard,
    ExternalLink,
    Users,
    Globe2,
    Database,
    Gauge,
    ShieldCheck,
} from 'lucide-react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { usePlans } from '../../../contexts/PlansContext';
import { useSafeUpgrade } from '../../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../../hooks/useCreditsUsage';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useTenant } from '../../../contexts/tenant';
import { supabase } from '../../../supabase';
import {
    SUBSCRIPTION_PLANS,
    PlanLimits,
    SubscriptionPlanId,
} from '../../../types/subscription';
import { formatPlanLimit } from '../../../services/billing/planCatalog';
import { settingsPanelClass } from './SettingsStatCard';

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
    free: 'from-q-surface-overlay to-q-surface-overlay',
    individual: 'from-q-accent to-q-error',
    agency_starter: 'from-q-accent to-q-accent',
    agency_pro: 'from-q-accent to-q-accent',
    agency_scale: 'from-q-accent to-q-accent',
    enterprise: 'from-q-accent to-q-accent',
};

const formatPrice = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '$0';
    return `$${value.toLocaleString()}`;
};

const formatNumber = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    return value.toLocaleString();
};

const formatQuota = (value?: number | null, suffix = '') => {
    const formatted = formatPlanLimit(value);
    return suffix ? `${formatted} ${suffix}` : formatted;
};

const getPlanSpecs = (limits: PlanLimits) => [
    { icon: Sparkles, labelKey: 'settings.subscription.aiCredits', fallback: 'Créditos IA', value: formatQuota(limits.maxAiCredits) },
    { icon: Rocket, labelKey: 'settings.subscription.projects', fallback: 'Proyectos', value: formatQuota(limits.maxProjects) },
    { icon: Database, labelKey: 'settings.subscription.storage', fallback: 'Almacenamiento', value: `${formatNumber(limits.maxStorageGB)} GB` },
    { icon: Users, labelKey: 'settings.subscription.users', fallback: 'Usuarios', value: formatQuota(limits.maxUsers) },
    { icon: Globe2, labelKey: 'settings.subscription.domains', fallback: 'Dominios', value: formatQuota(limits.maxDomains) },
    { icon: Gauge, labelKey: 'settings.subscription.apiRequests', fallback: 'API mensual', value: formatQuota(limits.maxApiRequests) },
];

interface SubscriptionDetails {
    stripe?: {
        id: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        cancelAt: string | null;
        status: string;
        latestInvoiceUrl?: string | null;
        latestInvoiceStatus?: string | null;
        amountDue?: number | null;
        currency?: string;
        paymentIssue?: {
            code?: string;
            declineCode?: string;
            message?: string;
        } | null;
    };
    local?: {
        status?: string;
        stripeCustomerId?: string | null;
        stripeSubscriptionId?: string | null;
    };
    cancelAtPeriodEnd?: boolean;
}

const SubscriptionSettings: React.FC = () => {
    const { t } = useTranslation();
    const { isUserOwner, userDocument } = useAuth();
    const { plansArray, getPlan } = usePlans();
    const upgradeContext = useSafeUpgrade();
    const tenantContext = useTenant();
    const { currentTenant } = tenantContext;
    const { usage, isLoading: isLoadingUsage, refresh } = useCreditsUsage();
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReactivating, setIsReactivating] = useState(false);
    const [isOpeningPortal, setIsOpeningPortal] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [pendingCancelImmediately, setPendingCancelImmediately] = useState(false);

    const fetchSubscriptionDetails = useCallback(async () => {
        if (!currentTenant?.id) return;

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'getSubscriptionDetails', tenantId: currentTenant.id }
            });
            if (result.error) throw result.error;
            setSubscriptionDetails(result.data?.data?.subscription || result.data?.subscription);
        } catch (error) {
            console.error('Error fetching subscription details:', error);
        }
    }, [currentTenant?.id]);

    // Fetch subscription details on mount
    useEffect(() => {
        fetchSubscriptionDetails();
    }, [fetchSubscriptionDetails]);

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
                fetchSubscriptionDetails();
                setTimeout(() => refresh(), 5000);
                setTimeout(() => refresh(), 10000);
            };

            refreshAfterCheckout();
        }
    }, [refresh, fetchSubscriptionDetails]);

    // Get current plan from usage or default to free
    const currentPlanId: SubscriptionPlanId = usage?.planId || 'free';
    const currentPlan = getPlan(currentPlanId) || SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.free;
    const IconComponent = PLAN_ICONS[currentPlanId] || Sparkles;
    const PlanIcon = IconComponent || (() => <div className="w-7 h-7 bg-muted rounded-full" />);
    const currentGradient = PLAN_GRADIENTS[currentPlanId] || PLAN_GRADIENTS.free;
    const subscriptionStatus = subscriptionDetails?.stripe?.status || usage?.status || 'active';
    const requiresPayment = usage?.requiresPayment || ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(subscriptionStatus);
    const statusLabel = subscriptionStatus === 'past_due'
        ? t('settings.subscription.statusPastDue', 'Pago pendiente')
        : subscriptionStatus === 'active'
            ? t('settings.subscription.statusActive', 'Activo')
            : subscriptionStatus === 'trial'
                ? t('settings.subscription.statusTrial', 'Trial')
                : subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled'
                    ? t('settings.subscription.statusCancelled', 'Cancelado')
                    : subscriptionStatus;
    const statusClass = requiresPayment
        ? 'bg-q-error text-white'
        : subscriptionStatus === 'active'
            ? `bg-gradient-to-r ${currentGradient} text-white`
            : 'bg-q-accent text-q-text-on-accent';

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
        fetchSubscriptionDetails();
    };

    const handleOpenBillingPortal = async () => {
        if (!currentTenant?.id) return;
        setIsOpeningPortal(true);
        setCheckoutError(null);
        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'createBillingPortalSession',
                    tenantId: currentTenant.id,
                    returnUrl: `${window.location.origin}/settings/subscription`,
                }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;
            if (data.url) {
                window.location.href = data.url;
                return;
            }
            throw new Error('No billing portal URL received');
        } catch (error: any) {
            console.error('Error opening billing portal:', error);
            setCheckoutError(error.message || t('settings.subscription.portalError', 'No se pudo abrir el portal de pagos'));
        } finally {
            setIsOpeningPortal(false);
        }
    };

    const handlePayInvoice = () => {
        const invoiceUrl = subscriptionDetails?.stripe?.latestInvoiceUrl;
        if (invoiceUrl) {
            window.location.href = invoiceUrl;
            return;
        }
        handleOpenBillingPortal();
    };

    const handleSelectPlan = async (planId: SubscriptionPlanId, billingCycle: 'monthly' | 'annually' = 'monthly') => {
        let tenantId = currentTenant?.id;

        if (!tenantId) {
            setCheckoutError(t('settings.subscription.noTenantError', 'No workspace found. Please refresh the page and try again.'));
            return;
        }

        setLoadingPlanId(planId);
        setCheckoutError(null);

        try {
            if (currentPlanId !== 'free') {
                try {
                    const result = await supabase.functions.invoke('stripe-api', {
                        body: {
                            action: 'updateSubscription',
                            tenantId,
                            newPlanId: planId,
                            billingCycle,
                        }
                    });

                    if (result.error) throw result.error;
                    const data = result.data?.data || result.data;

                    if (data.success) {
                        if (data.proration && data.proration.amount !== 0) {
                            alert(data.proration.description);
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

            const checkoutParams = {
                action: 'createSubscriptionCheckout',
                tenantId,
                planId,
                billingCycle,
                successUrl: `${window.location.origin}/settings/subscription?success=true&plan=${planId}`,
                cancelUrl: `${window.location.origin}/settings/subscription?cancelled=true`,
            };

            const result = await supabase.functions.invoke('stripe-api', {
                body: checkoutParams
            });

            if (result.error) throw result.error;
            const data = result.data?.data || result.data;

            if (data.url) {
                window.location.href = data.url;
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
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'cancelSubscription',
                    tenantId: currentTenant.id,
                    immediately,
                }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;

            alert(data.message);
            refresh();

            const detailsResult = await supabase.functions.invoke('stripe-api', {
                body: { action: 'getSubscriptionDetails', tenantId: currentTenant.id }
            });
            if (detailsResult.error) throw detailsResult.error;
            setSubscriptionDetails(detailsResult.data?.data?.subscription || detailsResult.data?.subscription);

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
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'reactivateSubscription', tenantId: currentTenant.id }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;
            alert(data.message);
            refresh();

            const detailsResult = await supabase.functions.invoke('stripe-api', {
                body: { action: 'getSubscriptionDetails', tenantId: currentTenant.id }
            });
            if (detailsResult.error) throw detailsResult.error;
            setSubscriptionDetails(detailsResult.data?.data?.subscription || detailsResult.data?.subscription);

        } catch (error: any) {
            console.error('Error reactivating subscription:', error);
            alert(error.message || 'Error al reactivar la suscripción');
        } finally {
            setIsReactivating(false);
        }
    };

    const allPlans = plansArray.length > 0
        ? plansArray
        : Object.values(SUBSCRIPTION_PLANS);
    const currentPlanIndex = allPlans.findIndex(p => p.id === currentPlanId);
    const safeCurrentPlanIndex = currentPlanIndex >= 0 ? currentPlanIndex : 0;

    // Determine "recommended" plan: next tier above current
    const recommendedPlanId = safeCurrentPlanIndex < allPlans.length - 1
        ? allPlans[safeCurrentPlanIndex + 1]?.id
        : null;

    const isUnlimitedUsage = Boolean(usage?.isUnlimited);
    const usagePercentage = isUnlimitedUsage ? 0 : usage?.percentage || 0;
    const planCreditLimitDisplay = formatQuota(currentPlan.limits.maxAiCredits);
    const creditsUsedDisplay = formatNumber(usage?.used || 0);
    const creditsRemainingDisplay = isUnlimitedUsage
        ? t('settings.subscription.internalOverride', 'Override interno')
        : formatNumber(usage?.remaining || 0);
    const currentPlanSpecs = getPlanSpecs(currentPlan.limits);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-q-accent">
                        {t('settings.subscription.overviewEyebrow', 'Plan del workspace')}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">
                        {t('settings.subscription.title', 'Plan y facturación')}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-q-text-muted">
                        {t('settings.subscription.overviewDesc', 'Revisa el plan activo, consumo de créditos y límites disponibles para este workspace.')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isLoadingUsage}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-q-border bg-q-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-q-surface-overlay disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                        {t('settings.subscription.refresh', 'Actualizar')}
                    </button>
                    {subscriptionDetails?.stripe && (
                        <button
                            type="button"
                            onClick={handleOpenBillingPortal}
                            disabled={isOpeningPortal}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-q-border bg-q-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-q-surface-overlay disabled:opacity-50"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {t('settings.subscription.billingPortal', 'Portal de facturación')}
                        </button>
                    )}
                </div>
            </div>

            <section className={`relative ${settingsPanelClass}`}>
                <div className={`h-1 bg-gradient-to-r ${currentGradient}`} />
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
                    <div className="min-w-0 p-5 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${currentGradient}`}>
                                    <PlanIcon className="h-6 w-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-2xl font-semibold text-foreground">
                                            {currentPlan.name}
                                        </h3>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                                            {statusLabel}
                                        </span>
                                        {isUnlimitedUsage && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-q-accent/25 bg-q-accent/10 px-2.5 py-1 text-xs font-semibold text-q-accent">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                {t('settings.subscription.platformOverride', 'Override interno')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-q-text-muted">
                                        {currentPlan.description}
                                    </p>
                                </div>
                            </div>

                            <div className="shrink-0 text-left sm:text-right">
                                <div className="text-3xl font-semibold text-foreground">
                                    {formatPrice(currentPlan.price.monthly)}
                                    <span className="ml-1 text-sm font-medium text-q-text-muted">/mes</span>
                                </div>
                                <p className="mt-1 text-xs text-q-text-muted">
                                    {t('settings.subscription.currentBilling', 'Plan actual')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {currentPlanSpecs.slice(0, 6).map((spec) => {
                                const Icon = spec.icon;
                                return (
                                    <div key={spec.labelKey} className="min-w-0 rounded-lg border border-q-border/70 bg-q-bg/60 p-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                            <Icon className="h-4 w-4 text-q-accent" />
                                            {t(spec.labelKey, spec.fallback)}
                                        </div>
                                        <div className="mt-2 text-xl font-semibold leading-tight text-foreground">
                                            {spec.value}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-q-border bg-q-bg/45 p-5 sm:p-6 lg:border-l lg:border-t-0">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Zap className="h-4 w-4 text-q-accent" />
                                    {t('settings.subscription.usageStatus', 'Uso de créditos')}
                                </h4>
                                <p className="mt-1 text-xs leading-5 text-q-text-muted">
                                    {isUnlimitedUsage
                                        ? t('settings.subscription.overrideUsageHint', 'Tu rol interno no consume el saldo del plan.')
                                        : t('settings.subscription.usageHint', 'Consumo mensual del workspace.')}
                                </p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isLoadingUsage}
                                className="rounded-lg p-2 text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-foreground disabled:opacity-50"
                                aria-label={t('common.refresh', 'Actualizar')}
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {isLoadingUsage ? (
                            <div className="mt-6 animate-pulse space-y-4">
                                <div className="h-3 rounded-full bg-q-surface-overlay" />
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="h-16 rounded-lg bg-q-surface-overlay" />
                                    <div className="h-16 rounded-lg bg-q-surface-overlay" />
                                    <div className="h-16 rounded-lg bg-q-surface-overlay" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mt-6">
                                    <div className="mb-2 flex items-center justify-between text-xs text-q-text-muted">
                                        <span>{t('settings.subscription.used', 'Usado')}</span>
                                        <span className="font-semibold text-foreground">{usagePercentage}%</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-q-surface-overlay">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${usagePercentage}%`,
                                                background: usagePercentage > 90
                                                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                                    : usagePercentage > 70
                                                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                                        : 'linear-gradient(90deg, var(--quimera-status-accent-from), var(--quimera-status-accent-to))',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-3">
                                    <div className="rounded-lg border border-q-border/70 bg-q-surface/70 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('settings.subscription.used', 'Usado')}
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{creditsUsedDisplay}</p>
                                    </div>
                                    <div className="rounded-lg border border-q-border/70 bg-q-surface/70 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('settings.subscription.limit', 'Límite')}
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{planCreditLimitDisplay}</p>
                                    </div>
                                    <div className="rounded-lg border border-q-border/70 bg-q-surface/70 p-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                            {t('settings.subscription.remaining', 'Restante')}
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-q-accent">{creditsRemainingDisplay}</p>
                                    </div>
                                </div>

                                {(usage?.isNearLimit || usage?.hasExceededLimit) && !isUserOwner && (
                                    <div className={`mt-4 rounded-lg border p-3 ${usage?.hasExceededLimit
                                        ? 'border-q-error/25 bg-q-error/10'
                                        : 'border-q-accent/25 bg-q-accent/10'
                                        }`}>
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${usage?.hasExceededLimit ? 'text-q-error' : 'text-q-accent'}`} />
                                            <div className="min-w-0">
                                                <p className={`text-xs font-semibold ${usage?.hasExceededLimit ? 'text-q-error' : 'text-q-accent'}`}>
                                                    {usage?.hasExceededLimit
                                                        ? t('settings.subscription.exceededLimit', 'Límite excedido')
                                                        : t('settings.subscription.nearLimit', 'Cerca del límite')}
                                                </p>
                                                {usage?.hasExceededLimit && (
                                                    <button
                                                        onClick={() => handleUpgradeClick('credits')}
                                                        className="mt-2 rounded-lg bg-q-error px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-q-error/90"
                                                    >
                                                        {t('settings.subscription.upgradeNow', 'Mejorar ahora')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {requiresPayment && (
                <div className="bg-q-error/10 border border-q-error/25 rounded-2xl p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-q-error/15 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-q-error" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-q-error dark:text-q-error">
                                    {t('settings.subscription.paymentRequiredTitle', 'Tu pago necesita atención')}
                                </h3>
                                <p className="text-sm text-q-error/80 dark:text-q-error/80 mt-1">
                                    {subscriptionDetails?.stripe?.paymentIssue?.message ||
                                        t('settings.subscription.paymentRequiredDesc', 'Actualiza tu método de pago o paga la factura pendiente para mantener tu plan activo.')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={handlePayInvoice}
                                disabled={isOpeningPortal}
                                className="px-4 py-2.5 rounded-xl bg-q-error text-white text-sm font-semibold hover:bg-q-error transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isOpeningPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                {t('settings.subscription.payInvoice', 'Pagar factura')}
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenBillingPortal}
                                disabled={isOpeningPortal}
                                className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {t('settings.subscription.managePayment', 'Método de pago')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-foreground">
                            {t('settings.subscription.availablePlans', 'Planes disponibles')}
                        </h3>
                        <p className="text-sm text-q-text-muted">
                            {t('settings.subscription.comparePlansDesc', 'Compara límites reales antes de cambiar el plan del workspace.')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {allPlans.map((plan) => {
                        const PlanIconComp = PLAN_ICONS[plan.id] || Sparkles;
                        const Icon = PlanIconComp || (() => <div className="w-5 h-5 bg-muted rounded-full" />);
                        const isCurrentPlan = plan.id === currentPlanId;
                        const isUpgrade = allPlans.findIndex(p => p.id === plan.id) > safeCurrentPlanIndex;
                        const isRecommended = plan.id === recommendedPlanId;
                        const isLoading = loadingPlanId === plan.id;
                        const gradient = PLAN_GRADIENTS[plan.id] || PLAN_GRADIENTS.free;
                        const specs = getPlanSpecs(plan.limits);

                        return (
                            <article
                                key={plan.id}
                                className={`relative flex min-h-[24rem] flex-col overflow-hidden rounded-lg border bg-q-surface/80 transition-colors ${isCurrentPlan
                                    ? 'border-q-accent/55'
                                    : isRecommended
                                        ? 'border-q-accent/40'
                                        : 'border-q-border/60 hover:border-q-border'
                                    }`}
                            >
                                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                                <div className="flex flex-1 flex-col p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
                                                <Icon className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-lg font-semibold leading-tight text-foreground">{plan.name}</h4>
                                                <p className="mt-1 text-sm leading-5 text-q-text-muted">{plan.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            {isCurrentPlan && (
                                                <span className="rounded-full bg-q-accent/15 px-2 py-1 text-[11px] font-semibold text-q-accent">
                                                    {t('settings.subscription.current', 'Actual')}
                                                </span>
                                            )}
                                            {isRecommended && !isCurrentPlan && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-q-accent px-2 py-1 text-[11px] font-semibold text-q-text-on-accent">
                                                    <Star className="h-3 w-3" />
                                                    {t('settings.subscription.recommended', 'Recomendado')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between gap-3 border-y border-q-border/60 py-4">
                                        <div>
                                            <div className="text-3xl font-semibold text-foreground">
                                                {formatPrice(plan.price.monthly)}
                                                <span className="ml-1 text-sm font-medium text-q-text-muted">/mes</span>
                                            </div>
                                            {typeof plan.price.annually === 'number' && plan.price.annually > 0 && (
                                                <p className="mt-1 text-xs text-q-text-muted">
                                                    {formatPrice(plan.price.annually)}/{t('settings.subscription.year', 'año')}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-right text-xs font-medium text-q-text-muted">
                                            {plan.features?.prioritySupport
                                                ? t('settings.subscription.prioritySupport', 'Soporte prioritario')
                                                : t('settings.subscription.standardSupport', 'Soporte estándar')}
                                        </p>
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                                        {specs.map((spec) => {
                                            const SpecIcon = spec.icon;
                                            return (
                                                <div key={spec.labelKey} className="min-w-0 rounded-lg bg-q-bg/60 p-3">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-q-text-muted">
                                                        <SpecIcon className="h-3.5 w-3.5 text-q-accent" />
                                                        <span className="truncate">{t(spec.labelKey, spec.fallback)}</span>
                                                    </div>
                                                    <div className="mt-1 text-base font-semibold text-foreground">{spec.value}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-auto pt-5">
                                        {isCurrentPlan ? (
                                        <button
                                            disabled
                                            className="flex h-11 w-full cursor-default items-center justify-center gap-2 rounded-lg bg-q-accent/15 text-sm font-semibold text-q-accent"
                                        >
                                            <Check className="h-4 w-4" />
                                            {t('settings.subscription.currentPlan', 'Plan Actual')}
                                        </button>
                                        ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={isLoading || loadingPlanId !== null}
                                            className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${isUpgrade
                                                ? 'quimera-guide-cta'
                                                : 'bg-q-surface-overlay text-foreground hover:bg-q-border/50'
                                                }`}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    {t('common.processing', 'Procesando...')}
                                                </>
                                            ) : isUpgrade ? (
                                                <>
                                                    {t('settings.subscription.upgrade', 'Mejorar Plan')}
                                                    <ArrowRight className="h-4 w-4" />
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
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════ */}
            {/* BILLING & MANAGEMENT                           */}
            {/* ═══════════════════════════════════════════════ */}
            {currentPlanId !== 'free' && subscriptionDetails?.stripe && (
                <div className={settingsPanelClass}>
                    <div className="p-5 border-b border-q-border flex items-center gap-3">
                        <Calendar className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                        <div>
                            <h4 className="font-semibold text-foreground">
                                {t('settings.subscription.billingPeriod', 'Período de Facturación')}
                            </h4>
                            <p className="text-sm text-q-text-muted">
                                {t('settings.subscription.billingDesc', 'Detalles de tu ciclo de facturación actual')} · {statusLabel}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Timeline */}
                        <div className="relative">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-secondary/30 border border-q-border">
                                    <span className="text-xs text-q-text-muted block mb-1">
                                        {t('settings.subscription.periodStart', 'Inicio del período')}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {new Date(subscriptionDetails.stripe.currentPeriodStart).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl bg-secondary/30 border border-q-border">
                                    <span className="text-xs text-q-text-muted block mb-1">
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
                            <div className="p-4 rounded-xl bg-q-accent/10 border border-q-accent/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-q-accent" />
                                        <span className="text-sm text-q-accent dark:text-q-accent">
                                            {t('settings.subscription.willCancel', 'Tu suscripción se cancelará el')} {new Date(subscriptionDetails.stripe.currentPeriodEnd).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleReactivateSubscription}
                                        disabled={isReactivating}
                                        className="quimera-guide-cta px-4 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center gap-1.5"
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

                        {subscriptionDetails.stripe.latestInvoiceUrl && (
                            <div className="pt-4 border-t border-q-border flex flex-col sm:flex-row gap-2">
                                <button
                                    type="button"
                                    onClick={handlePayInvoice}
                                    disabled={isOpeningPortal}
                                    className="quimera-guide-cta px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isOpeningPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                    {requiresPayment
                                        ? t('settings.subscription.payPendingInvoice', 'Pagar factura pendiente')
                                        : t('settings.subscription.viewInvoice', 'Ver última factura')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenBillingPortal}
                                    disabled={isOpeningPortal}
                                    className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {t('settings.subscription.billingPortal', 'Portal de facturación')}
                                </button>
                            </div>
                        )}

                        {/* Cancel Subscription Button */}
                        {!subscriptionDetails.stripe.cancelAtPeriodEnd && (
                            <div className="pt-4 border-t border-q-border">
                                <button
                                    onClick={() => handleCancelSubscription(false)}
                                    disabled={isCancelling}
                                    className="text-sm text-q-error hover:text-q-error dark:hover:text-q-error flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                <div className="bg-q-error/10 border border-q-error/20 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-q-error mt-0.5" />
                        <div>
                            <p className="text-sm text-q-error dark:text-q-error font-semibold">
                                {t('settings.subscription.checkoutErrorTitle', 'Error al procesar')}
                            </p>
                            <p className="text-xs text-q-error/80 dark:text-q-error/80 mt-1">
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
