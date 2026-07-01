/**
 * NoCreditsGlobalBanner
 * Banner rojo fijo que se muestra en la parte superior del dashboard
 * cuando el usuario ha agotado sus créditos de IA.
 * No se puede cerrar — persiste hasta que compre créditos o actualice plan.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Crown, Zap, ArrowRight, ShoppingCart } from 'lucide-react';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { useAuth } from '../../contexts/core/AuthContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import PurchaseCreditsModal from './PurchaseCreditsModal';
import { isPlatformUnlimitedUser } from '../../services/billing/planCatalog';

interface NoCreditsGlobalBannerProps {
    className?: string;
}

const NoCreditsGlobalBanner: React.FC<NoCreditsGlobalBannerProps> = ({ className = '' }) => {
    const { t } = useTranslation();
    const { usage, isLoading } = useCreditsUsage();
    const { userDocument, isUserOwner } = useAuth();
    const upgradeContext = useSafeUpgrade();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    // Check role hierarchy
    const userRole = isUserOwner ? 'owner' : userDocument?.role;
    const isOwner = isPlatformUnlimitedUser(userRole);

    // Don't show for owner/superadmin platform bypass or while loading.
    if (isLoading || isOwner) {
        return null;
    }

    // Only show when credits are fully exhausted
    if (!usage?.hasExceededLimit) {
        return null;
    }

    const handleUpgradeClick = () => {
        if (upgradeContext) {
            upgradeContext.showCreditsUpgrade(0, usage.limit);
        }
    };

    return (
        <>
            <div
                className={`w-full bg-gradient-to-r from-q-error via-q-error to-q-error text-white px-4 py-3 shadow-lg shadow-q-error/20 z-50 ${className}`}
                role="alert"
                aria-live="assertive"
            >
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Left — Message */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-q-surface/20 flex-shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm sm:text-base">
                                {t('credits.noCreditsTitle')}
                            </p>
                            <p className="text-xs sm:text-sm text-q-error">
                                {t('credits.noCreditsDescription')}
                            </p>
                        </div>
                    </div>

                    {/* Right — Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setShowPurchaseModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-q-surface text-q-error rounded-lg text-sm font-bold hover:bg-q-error/10 transition-colors shadow-md"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {t('credits.buyCredits')}
                        </button>
                        <button
                            onClick={handleUpgradeClick}
                            className="flex items-center gap-2 px-4 py-2 bg-q-surface/20 text-white rounded-lg text-sm font-semibold hover:bg-q-surface/30 transition-colors border border-q-border/30"
                        >
                            <Crown className="w-4 h-4" />
                            {t('credits.upgradePlan')}
                        </button>
                    </div>
                </div>
            </div>

            <PurchaseCreditsModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
            />
        </>
    );
};

export default NoCreditsGlobalBanner;
