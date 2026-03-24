/**
 * AI Credits Usage Component
 * Componente para visualizar el uso de AI credits con barra de progreso y estadísticas
 * Integrado con UpgradeContext para mostrar modal de upgrade automáticamente
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Sparkles,
    TrendingUp,
    AlertTriangle,
    ChevronRight,
    Zap,
    ImageIcon,
    MessageSquare,
    FileText,
    RefreshCw,
    Package,
    Crown,
} from 'lucide-react';
import { useAiCredits, useCreditsProgress } from '../../hooks/useAiCredits';
import {
    AiCreditOperation,
    AI_CREDIT_COSTS,
    AI_CREDIT_PACKAGES,
    SUBSCRIPTION_PLANS,
    SubscriptionPlanId,
    getUsageColor,
} from '../../types/subscription';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { useAuth } from '../../contexts/core/AuthContext';
import ProgressBar3D from './ProgressBar3D';
import { getCreditsUsageWithPoolDetection } from '../../services/aiCreditsService';
import PurchaseCreditsModal from './PurchaseCreditsModal';

// =============================================================================
// TYPES
// =============================================================================

interface AiCreditsUsageProps {
    tenantId: string;
    userId: string;
    variant?: 'compact' | 'full' | 'minimal';
    showUpgradeButton?: boolean;
    onUpgradeClick?: () => void;
    onBuyCreditsClick?: () => void;
    className?: string;
}

interface CreditOperationBadgeProps {
    operation: AiCreditOperation;
    showCost?: boolean;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Badge que muestra el costo en credits de una operación
 */
export const CreditOperationBadge: React.FC<CreditOperationBadgeProps> = ({
    operation,
    showCost = true,
}) => {
    const cost = AI_CREDIT_COSTS[operation];

    const operationIcons: Record<AiCreditOperation, React.ReactNode> = {
        onboarding_complete: <Sparkles className="w-3 h-3" />,
        design_plan: <FileText className="w-3 h-3" />,
        content_generation: <FileText className="w-3 h-3" />,
        image_generation: <ImageIcon className="w-3 h-3" />,
        image_generation_fast: <ImageIcon className="w-3 h-3" />,
        image_generation_ultra: <ImageIcon className="w-3 h-3" />,
        chatbot_message: <MessageSquare className="w-3 h-3" />,
        ai_assistant_request: <Zap className="w-3 h-3" />,
        ai_assistant_complex: <Zap className="w-3 h-3" />,
        product_description: <FileText className="w-3 h-3" />,
        seo_optimization: <TrendingUp className="w-3 h-3" />,
        email_generation: <FileText className="w-3 h-3" />,
        translation: <FileText className="w-3 h-3" />,
    };

    const operationLabels: Record<AiCreditOperation, string> = {
        onboarding_complete: t('credits.opNewSite'),
        design_plan: t('credits.opDesignPlan'),
        content_generation: t('credits.opContent'),
        image_generation: t('credits.opImage'),
        image_generation_fast: t('credits.opImageFast'),
        image_generation_ultra: t('credits.opImageHD'),
        chatbot_message: t('credits.opChat'),
        ai_assistant_request: t('credits.opAssistant'),
        ai_assistant_complex: t('credits.opAssistantPlus'),
        product_description: t('credits.opProduct'),
        seo_optimization: t('credits.opSEO'),
        email_generation: t('credits.opEmail'),
        translation: t('credits.opTranslation'),
    };

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs">
            {operationIcons[operation]}
            <span>{operationLabels[operation]}</span>
            {showCost && (
                <span className="text-purple-400 font-medium">{cost}</span>
            )}
        </span>
    );
};

/**
 * Barra de progreso circular
 */
const CircularProgress: React.FC<{
    percentage: number;
    color: string;
    size?: number;
    strokeWidth?: number;
}> = ({ percentage, color, size = 60, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-white/10"
            />
            {/* Progress circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
            />
        </svg>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Pool info interface for shared credits
interface SharedPoolInfo {
    isSharedPool: boolean;
    poolTenantId: string;
    agencyName?: string;
}

export const AiCreditsUsage: React.FC<AiCreditsUsageProps> = ({
    tenantId,
    userId,
    variant = 'full',
    showUpgradeButton = true,
    onUpgradeClick,
    onBuyCreditsClick,
    className = '',
}) => {
    const { t } = useTranslation();
    const {
        isLoading,
        error,
        usage,
        creditsRemaining,
        creditsUsed,
        creditsIncluded,
        usagePercentage,
        usageColor,
        isNearLimit,
        hasExceededLimit,
        currentPlan,
        refresh,
        formatCredits,
        getUsageByOperation,
    } = useAiCredits({ tenantId, userId });

    // Use global upgrade context if available
    const upgradeContext = useSafeUpgrade();
    const { isUserOwner, userDocument, loadingAuth } = useAuth();
    // Check role first (most reliable), then email-based owner check as fallback
    const userRole = userDocument?.role;
    const isOwner = userRole === 'owner' || userRole === 'superadmin' || isUserOwner;

    const [usageByOperation, setUsageByOperation] = useState<Record<string, { count: number; credits: number }>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    // Shared pool info for agency sub-clients
    const [poolInfo, setPoolInfo] = useState<SharedPoolInfo>({
        isSharedPool: false,
        poolTenantId: tenantId,
    });

    // Detect shared pool on mount
    useEffect(() => {
        const detectSharedPool = async () => {
            try {
                const info = await getCreditsUsageWithPoolDetection(tenantId);
                setPoolInfo({
                    isSharedPool: info.isSharedPool,
                    poolTenantId: info.poolTenantId,
                    agencyName: info.agencyName,
                });
            } catch (err) {
                console.error('Error detecting shared pool:', err);
            }
        };
        detectSharedPool();
    }, [tenantId]);

    // Handler for upgrade click - uses context if available, or prop callback
    const handleUpgradeClick = () => {
        if (onUpgradeClick) {
            onUpgradeClick();
        } else if (upgradeContext && !isOwner) {
            upgradeContext.showCreditsUpgrade(creditsRemaining, creditsIncluded);
        }
    };

    // Cargar uso por operación
    useEffect(() => {
        const loadOperationUsage = async () => {
            const data = await getUsageByOperation();
            setUsageByOperation(data);
        };
        loadOperationUsage();
    }, [getUsageByOperation, usage]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setIsRefreshing(false);
    };

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-4 ${className}`}>
                <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
        );
    }

    // Variante minimal - solo el número
    if (variant === 'minimal') {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium" style={{ color: usageColor }}>
                    {formatCredits(creditsRemaining)}
                </span>
            </div>
        );
    }

    // Variante compact - barra pequeña
    if (variant === 'compact') {
        return (
            <div className={`bg-[#1a1a2e]/80 rounded-lg p-3 border border-white/10 ${className}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">{t('credits.aiCredits')}</span>
                    </div>
                    <span className="text-xs text-white/60">
                        {formatCredits(creditsRemaining)} {t('credits.remaining')}
                    </span>
                </div>

                {/* Progress bar */}
                <ProgressBar3D
                    percentage={Math.min(usagePercentage, 100)}
                    color={usageColor}
                    size="md"
                />

                {/* Warning */}
                {isNearLimit && !hasExceededLimit && !isOwner && (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t('credits.fewCreditsLeft')}
                    </p>
                )}

                {hasExceededLimit && !isOwner && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t('credits.exceededLimit')}
                    </p>
                )}
            </div>
        );
    }

    // Variante full - panel completo
    return (
    <>
        <div className={`bg-[#1a1a2e]/80 rounded-xl border border-white/10 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{t('credits.aiCredits')}</h3>
                            <p className="text-xs text-white/60">
                                Plan {currentPlan?.name || 'Free'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-white/60 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Shared Pool Indicator for Agency Sub-clients */}
                {poolInfo.isSharedPool && poolInfo.agencyName && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-indigo-300 font-medium">
                                {t('credits.sharedPool')}
                            </p>
                            <p className="text-xs text-indigo-400/70">
                                {t('credits.creditsFrom', { name: poolInfo.agencyName })}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Usage display */}
            <div className="p-4">
                <div className="flex items-center gap-6">
                    {/* Circular progress */}
                    <div className="relative">
                        <CircularProgress
                            percentage={usagePercentage}
                            color={usageColor}
                            size={80}
                            strokeWidth={8}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-white">
                                {usagePercentage}%
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-white/60 mb-1">{t('credits.used')}</p>
                                <p className="text-lg font-semibold text-white">
                                    {formatCredits(creditsUsed)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-white/60 mb-1">{t('credits.remaining')}</p>
                                <p className="text-lg font-semibold" style={{ color: isOwner ? '#a855f7' : usageColor }}>
                                    {isOwner ? '∞' : formatCredits(creditsRemaining)}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-white/60 mb-1">{t('credits.includedInPlan')}</p>
                                <p className="text-sm text-white">
                                    {isOwner ? t('credits.unlimited') : `${formatCredits(creditsIncluded)} credits/${t('credits.month')}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warnings */}
                {isNearLimit && !hasExceededLimit && !isOwner && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-amber-400 font-medium">
                                    {t('credits.fewCreditsLeft')}
                                </p>
                                <p className="text-xs text-amber-400/80 mt-1">
                                    {t('credits.considerUpgrade')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {hasExceededLimit && !isOwner && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-400 font-medium">
                                    {t('credits.exceededLimitFull')}
                                </p>
                                <p className="text-xs text-red-400/80 mt-1">
                                    {t('credits.upgradeToContine')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Usage breakdown */}
            {Object.keys(usageByOperation).length > 0 && (
                <div className="px-4 pb-4">
                    <p className="text-xs text-white/60 mb-2">{t('credits.usageByType')}</p>
                    <div className="space-y-2">
                        {Object.entries(usageByOperation)
                            .sort((a, b) => b[1].credits - a[1].credits)
                            .slice(0, 5)
                            .map(([operation, data]) => (
                                <div key={operation} className="flex items-center justify-between">
                                    <CreditOperationBadge
                                        operation={operation as AiCreditOperation}
                                        showCost={false}
                                    />
                                    <div className="text-right">
                                        <span className="text-sm text-white font-medium">
                                            {data.credits}
                                        </span>
                                        <span className="text-xs text-white/40 ml-1">
                                            ({data.count}x)
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            {showUpgradeButton && (
                <div className="p-4 border-t border-white/10 bg-white/5">
                    <div className="flex gap-2">
                        {/* Buy credits button — always visible now (uses internal modal if no external callback) */}
                        <button
                            onClick={onBuyCreditsClick || (() => setShowPurchaseModal(true))}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                        >
                            <Package className="w-4 h-4" />
                            {t('credits.buyCredits')}
                        </button>

                        {/* Show upgrade button if callback provided OR if upgrade context available (and NOT owner) */}
                        {(onUpgradeClick || (upgradeContext && !isOwner)) && (
                            <button
                                onClick={handleUpgradeClick}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-medium transition-colors"
                            >
                                <Crown className="w-4 h-4" />
                                {t('credits.upgrade')}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Internal purchase modal (used when no external onBuyCreditsClick provided) */}
        <PurchaseCreditsModal
            isOpen={showPurchaseModal}
            onClose={() => setShowPurchaseModal(false)}
        />
    </>
    );
};

// =============================================================================
// CREDIT PACKAGES COMPONENT
// =============================================================================

interface CreditPackagesProps {
    onSelectPackage: (packageId: string) => void;
    className?: string;
}

export const CreditPackages: React.FC<CreditPackagesProps> = ({
    onSelectPackage,
    className = '',
}) => {
    return (
        <div className={`grid grid-cols-2 gap-3 ${className}`}>
            {AI_CREDIT_PACKAGES.map((pkg) => (
                <button
                    key={pkg.id}
                    onClick={() => onSelectPackage(pkg.id)}
                    className={`
                        relative p-4 rounded-xl border transition-all text-left
                        ${pkg.isPopular
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }
                    `}
                >
                    {pkg.isPopular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-purple-500 text-xs text-white font-medium">
                            {t('credits.popular')}
                        </span>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold text-white">{pkg.credits.toLocaleString()}</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-white">${pkg.price}</span>
                        <span className="text-xs text-white/60">USD</span>
                    </div>

                    {pkg.discount > 0 && (
                        <span className="text-xs text-green-400 mt-1 block">
                            {pkg.discount}% {t('credits.discount')}
                        </span>
                    )}

                    <p className="text-xs text-white/40 mt-2">
                        ${pkg.pricePerCredit.toFixed(3)}/credit
                    </p>
                </button>
            ))}
        </div>
    );
};

// =============================================================================
// INLINE CREDIT INDICATOR
// =============================================================================

interface InlineCreditIndicatorProps {
    tenantId: string;
    operation?: AiCreditOperation;
    className?: string;
}

export const InlineCreditIndicator: React.FC<InlineCreditIndicatorProps> = ({
    tenantId,
    operation,
    className = '',
}) => {
    const { percentage, color, label, isLoading } = useCreditsProgress(tenantId);

    if (isLoading) {
        return (
            <div className={`animate-pulse bg-white/10 rounded h-4 w-20 ${className}`} />
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex-1 min-w-[60px]">
                <ProgressBar3D
                    percentage={percentage}
                    color={color}
                    size="sm"
                />
            </div>
            <span className="text-xs text-white/60 whitespace-nowrap">{label}</span>
            {operation && (
                <span className="text-xs text-purple-400">
                    -{AI_CREDIT_COSTS[operation]}
                </span>
            )}
        </div>
    );
};

export default AiCreditsUsage;

export { PurchaseCreditsModal };






