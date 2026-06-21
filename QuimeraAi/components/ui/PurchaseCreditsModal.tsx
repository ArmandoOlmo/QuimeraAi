/**
 * PurchaseCreditsModal
 * Modal para comprar paquetes de créditos de IA via Stripe Checkout.
 * Funciona para usuarios regulares y agencias.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Zap, Check, Loader2, Crown, Sparkles, AlertTriangle } from 'lucide-react';
import { AI_CREDIT_PACKAGES, AiCreditPackage } from '../../types/subscription';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/core/AuthContext';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';

interface PurchaseCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const [loading, setLoading] = useState<string | null>(null); // packageId being purchased
    const [error, setError] = useState<string | null>(null);

    const tenantId = tenantContext?.currentTenant?.id || `tenant_${user?.id}`;
    const isAgency = !!tenantContext?.currentTenant?.subscriptionPlan?.includes('agency');

    if (!isOpen) return null;

    const handlePurchase = async (pkg: AiCreditPackage) => {
        if (!user) {
            setError(t('credits.mustBeAuthenticated'));
            return;
        }

        setLoading(pkg.id);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'createCreditPackageCheckout',
                    packageId: pkg.id,
                    tenantId,
                    successUrl: window.location.href,
                    cancelUrl: window.location.href,
                }
            });

            if (result.error) throw result.error;

            // Redirect to Stripe Checkout
            const data = result.data?.data || result.data;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error('[PurchaseCreditsModal] Error:', err);
            setError(err.message || t('credits.checkoutError'));
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-q-text/60 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-2xl bg-q-surface border border-q-border rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 border-b border-q-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center text-q-accent">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">{t('credits.purchaseTitle')}</h2>
                                <p className="text-xs text-q-text-muted">
                                    {isAgency
                                        ? t('credits.agencyPoolDescription')
                                        : t('credits.personalDescription')
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Agency indicator */}
                {isAgency && (
                    <div className="mx-6 mt-4 px-4 py-2.5 bg-q-accent/10 border border-q-accent/20 rounded-lg flex items-center gap-2">
                        <Crown className="w-4 h-4 text-q-accent flex-shrink-0" />
                        <span className="text-xs text-q-accent">
                            <strong>{t('credits.sharedPool')}</strong> — {t('credits.sharedPoolDescription')}
                        </span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 px-4 py-2.5 bg-q-error/10 border border-q-error/20 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-q-error flex-shrink-0" />
                        <span className="text-xs text-q-error">{error}</span>
                    </div>
                )}

                {/* Packages Grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {AI_CREDIT_PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`relative rounded-xl border p-4 transition-all cursor-pointer hover:shadow-lg ${
                                pkg.isPopular
                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                    : 'border-q-border bg-q-surface hover:border-primary/40'
                            }`}
                            onClick={() => !loading && handlePurchase(pkg)}
                        >
                            {/* Popular badge */}
                            {pkg.isPopular && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-q-accent to-q-warning text-q-text-on-accent text-[10px] font-bold rounded-full shadow-md uppercase tracking-wider">
                                    {t('credits.popular')}
                                </div>
                            )}

                            {/* Credits amount */}
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className={`w-4 h-4 ${pkg.isPopular ? 'text-q-accent' : 'text-primary'}`} />
                                <span className="font-bold text-foreground text-lg">
                                    {pkg.credits.toLocaleString()}
                                </span>
                                <span className="text-xs text-q-text-muted">{t('credits.creditsLabel')}</span>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-2xl font-extrabold text-foreground">${pkg.price}</span>
                                <span className="text-xs text-q-text-muted">USD</span>
                            </div>

                            {/* Price per credit */}
                            <div className="text-xs text-q-text-muted mb-3">
                                ${pkg.pricePerCredit.toFixed(3)} {t('credits.perCredit')}
                                {pkg.discount > 0 && (
                                    <span className="ml-1.5 text-q-success font-semibold">
                                        -{pkg.discount}%
                                    </span>
                                )}
                            </div>

                            {/* Buy button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePurchase(pkg);
                                }}
                                disabled={!!loading}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    pkg.isPopular
                                        ? 'bg-gradient-to-r from-q-accent to-q-warning text-q-text-on-accent hover:shadow-lg hover:shadow-q-accent/20'
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                } ${loading === pkg.id ? 'opacity-75' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading === pkg.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('credits.redirecting')}
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {t('credits.buy')}
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-secondary/30 border-t border-q-border text-center">
                    <p className="text-xs text-q-text-muted">
                        {t('credits.securePayment')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PurchaseCreditsModal;
