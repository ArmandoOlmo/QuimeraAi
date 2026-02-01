/**
 * UpgradeBanner
 * Banner prominente para mostrar el plan actual y opciones de upgrade
 * Solo se muestra para usuarios regulares, NO para Super Administradores
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Sparkles,
    Crown,
    ArrowRight,
    Zap,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';
import { usePlans } from '../../contexts/PlansContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { useAuth } from '../../contexts/core/AuthContext';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';

interface UpgradeBannerProps {
    variant?: 'full' | 'compact';
    className?: string;
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
    variant = 'full',
    className = ''
}) => {
    const { t } = useTranslation();
    const { plansArray, getPlan } = usePlans();
    const upgradeContext = useSafeUpgrade();
    const { usage, isLoading } = useCreditsUsage();
    const { canAccessSuperAdmin } = useAuth();

    const handleUpgradeClick = () => {
        if (upgradeContext) {
            if (usage?.isNearLimit || usage?.hasExceededLimit) {
                upgradeContext.showCreditsUpgrade(usage.remaining, usage.limit);
            } else {
                upgradeContext.openUpgradeModal('generic');
            }
        }
    };

    // No mostrar para Super Administradores (owner, superadmin, admin, manager)
    if (canAccessSuperAdmin) {
        return null;
    }

    // Si ya está en el plan más alto, no mostrar el banner
    if (usage?.planId === 'enterprise') {
        return null;
    }

    // Get current plan data (try context first, then fallback)
    const currentPlanId = usage?.planId || 'free';
    const currentPlan = getPlan(currentPlanId) || SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.free;

    // Determinar el siguiente plan disponible (excluyendo archivados)
    let nextPlan = null;
    const currentIndex = plansArray.findIndex(p => p.id === currentPlanId);

    if (currentIndex !== -1 && currentIndex < plansArray.length - 1) {
        // Si el plan actual está activo y no es el último
        nextPlan = plansArray[currentIndex + 1];
    } else if (currentIndex === -1) {
        // Si el plan actual está archivado o no encontrado, buscar el siguiente por precio
        nextPlan = plansArray.find(p => p.price.monthly > currentPlan.price.monthly);
    }

    if (variant === 'compact') {
        return (
            <div className={`bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 rounded-xl border border-primary/20 p-4 ${className}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {isLoading ? '...' : `Plan ${usage?.plan || 'Free'}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {isLoading ? '...' : `${usage?.remaining || 0} ${t('dashboard.creditsRemaining')}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleUpgradeClick}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <Crown className="w-4 h-4" />
                        {t('common.upgrade')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl border border-border ${className}`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left - Plan Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="p-3 rounded-xl"
                                style={{
                                    backgroundColor: `${SUBSCRIPTION_PLANS[usage?.planId || 'free'].color}20`
                                }}
                            >
                                <Sparkles
                                    className="w-6 h-6"
                                    style={{ color: SUBSCRIPTION_PLANS[usage?.planId || 'free'].color }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-foreground">
                                        {isLoading ? t('common.loading') : `Plan ${usage?.plan || 'Free'}`}
                                    </h3>
                                    <span
                                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: `${SUBSCRIPTION_PLANS[usage?.planId || 'free'].color}20`,
                                            color: SUBSCRIPTION_PLANS[usage?.planId || 'free'].color
                                        }}
                                    >
                                        {t('dashboard.currentPlan')}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {SUBSCRIPTION_PLANS[usage?.planId || 'free'].description}
                                </p>
                            </div>
                        </div>

                        {/* Credits Progress */}
                        {!isLoading && usage && (
                            <div className="bg-secondary/50 rounded-xl p-4 mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-primary" />
                                        AI Credits
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {usage.used} / {usage.limit}
                                    </span>
                                </div>
                                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${usage.percentage}%`,
                                            backgroundColor: usage.color,
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground">
                                        {usage.remaining} {t('dashboard.creditsRemaining')}
                                    </span>
                                    {usage.isNearLimit && (
                                        <span className="text-xs text-amber-500 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {t('dashboard.nearLimit')}
                                        </span>
                                    )}
                                    {usage.hasExceededLimit && (
                                        <span className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {t('dashboard.limitExceeded')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right - Upgrade CTA */}
                    {nextPlan && (
                        <div className="lg:w-80 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl border border-primary/20 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium text-foreground">
                                    {t('dashboard.upgradeToUnlock')} {nextPlan.name}
                                </span>
                            </div>

                            <ul className="space-y-2 mb-4">
                                <li className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {nextPlan.limits.maxAiCredits.toLocaleString()} AI credits{t('dashboard.perMonth')}
                                </li>
                                <li className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {nextPlan.limits.maxProjects} {t('settings.subscription.projects')}
                                </li>
                                {nextPlan.features.ecommerceEnabled && (
                                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {t('dashboard.ecommerceIncluded')}
                                    </li>
                                )}
                                {nextPlan.features.customDomains && (
                                    <li className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {t('dashboard.customDomainsIncluded')}
                                    </li>
                                )}
                            </ul>

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-2xl font-bold text-foreground">
                                        ${nextPlan.price.monthly}
                                    </span>
                                    <span className="text-sm text-muted-foreground">{t('dashboard.perMonth')}</span>
                                </div>
                                {nextPlan.price.annually < nextPlan.price.monthly && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
                                        {t('dashboard.savePerYear', { amount: (nextPlan.price.monthly - nextPlan.price.annually) * 12 })}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={handleUpgradeClick}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
                            >
                                <Crown className="w-5 h-5" />
                                {t('dashboard.upgradeNow')}
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpgradeBanner;




