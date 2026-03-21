/**
 * NoCreditsGlobalBanner
 * Banner rojo fijo que se muestra en la parte superior del dashboard
 * cuando el usuario ha agotado sus créditos de IA.
 * No se puede cerrar — persiste hasta que compre créditos o actualice plan.
 */

import React, { useState } from 'react';
import { AlertTriangle, Crown, Zap, ArrowRight, ShoppingCart } from 'lucide-react';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { useAuth } from '../../contexts/core/AuthContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import PurchaseCreditsModal from './PurchaseCreditsModal';

interface NoCreditsGlobalBannerProps {
    className?: string;
}

const NoCreditsGlobalBanner: React.FC<NoCreditsGlobalBannerProps> = ({ className = '' }) => {
    const { usage, isLoading } = useCreditsUsage();
    const { canAccessSuperAdmin, isUserOwner, userDocument } = useAuth();
    const upgradeContext = useSafeUpgrade();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    // Check role hierarchy
    const userRole = userDocument?.role;
    const isOwner = userRole === 'owner' || userRole === 'superadmin' || isUserOwner;

    // Don't show for owners, super admins, or while loading
    if (isLoading || isOwner || canAccessSuperAdmin) {
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
                className={`w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white px-4 py-3 shadow-lg shadow-red-500/20 z-50 ${className}`}
                role="alert"
                aria-live="assertive"
            >
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Left — Message */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 flex-shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm sm:text-base">
                                ¡Se te acabaron los créditos de IA!
                            </p>
                            <p className="text-xs sm:text-sm text-red-100">
                                No puedes usar funciones de IA hasta que compres más créditos o actualices tu plan.
                            </p>
                        </div>
                    </div>

                    {/* Right — Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setShowPurchaseModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors shadow-md"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Comprar Créditos
                        </button>
                        <button
                            onClick={handleUpgradeClick}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors border border-white/30"
                        >
                            <Crown className="w-4 h-4" />
                            Actualizar Plan
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
